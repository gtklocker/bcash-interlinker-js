const _ = require('lodash');
const bcash = require('bcash');
const {fromRev, revHex} = require('bcash/lib/utils/util');
const pEvent = require('p-event');

const Interlink = require('./Interlink');
const taggedSPVOutput = require('./TXHelpers');

const VELVET_GENESIS =
  fromRev('00000000000001934669a81ecfaa64735597751ac5ca78c4d8f345f11c2237cf');

module.exports = class InterlinkerNode extends bcash.SPVNode {
  constructor(options) {
    super(options);
    this.walletDB = this.use(bcash.wallet.plugin).wdb;
    this.ourLogger = this.logger.context('interlinker');

    this.maybeSynced = _.debounce(this.onSync, 5000);
  }

  onSync() {
    this.ourLogger.info('chain synced');
    this.wallet = this.walletDB.primary;
    this.removeListener('block', this.maybeSynced);
    this.on('block', async (blk) => {
      this.ourLogger.info('got block event (blkid=%s, height=%d)', blk.rhash(), blk.height);
      await this.doInterlink();
    });
    this.doInterlink().then();
  }

  startInterlinking() {
    this.on('block', this.maybeSynced);
    this.on('error', err => {
      console.log(`got error: ${err}`);
    });
    this.onSync();
  }

  async doInterlink() {
    const interlink = await this.getInterlinkSinceBlock(VELVET_GENESIS);
    const hash = interlink.hash();

    this.ourLogger.info('interlink hash = %s', hash.toString('hex'));
    try {
      const tx = await this.wallet.send({
        outputs: [bcash.Output.fromScript(taggedSPVOutput(hash), 0)],
      });
      this.ourLogger.info('sent tx (txid=%s)', revHex(tx.hash()));
    } catch (e) {
      this.ourLogger.error(e);
      this.ourLogger.error('not enough funds to publish interlink tx');
      this.ourLogger.error('feed me: %s', await this.wallet.receiveAddress());
      return; // TODO: replace with InsufficientFundsError
    }
  }

  async getInterlinkSinceBlock(blockId) {
    const interlink = new Interlink();
    let blk = await this.chain.getEntryByHash(blockId);
    let blockCount = 0;
    let lastBlock = blk;
    while (blk) {
      ++blockCount;
      lastBlock = blk;
      interlink.update(blk.hash);
      blk = await this.chain.getNextEntry(blk);
    }
    this.ourLogger.info('saw %d blocks', blockCount);
    this.ourLogger.info('last block (id=%s, height=%d)', revHex(lastBlock.hash), lastBlock.height);
    return interlink;
  }
};
