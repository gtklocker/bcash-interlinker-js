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
    this.bestTip = null;
  }

  startInterlinking() {
    this.chain.on('tip', async (tip) => {
      this.ourLogger.debug('got tip event (blkid=%s, height=%d)', revHex(tip.hash), tip.height);
      if (this.bestTip) {
        if (this.bestTip.height > tip.height) {
          this.ourLogger.info('ignoring old block (best height=%d, other' +
            ' height=%d)', this.bestTip.height, tip.height);
          return;
        }
        if (this.bestTip.height === tip.height && this.bestTip.hash.equals(tip.hash)) {
          this.ourLogger.info('tip event is for the same block as last time, discarding');
          return;
        }
      }

      const synced = this.chain.synced;
      const progress = this.chain.getProgress();

      if (!synced || progress < 1) {
        this.ourLogger.info('tip event about something new but we\'re still not' +
          ' completely synced (synced=%d, progress=%f%%)',
          synced, progress);
        return;
      }

      this.ourLogger.info('new best tip (blkid=%s, height=%d)', revHex(tip.hash), tip.height);
      this.bestTip = tip;
      await this.doInterlink();
    });
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
