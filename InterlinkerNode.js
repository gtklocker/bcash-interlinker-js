const bcash = require('bcash');
const {fromRev} = require('bcash/lib/utils/util');
const pEvent = require('p-event');

const Interlink = require('./Interlink');
const taggedSPVTx = require('./script');

const MARKED_BLOCK_HASH =
  fromRev('00000000000001934669a81ecfaa64735597751ac5ca78c4d8f345f11c2237cf');

module.exports = class InterlinkerNode extends bcash.SPVNode {
  constructor(options) {
    super(options);
    this.walletDB = this.use(bcash.wallet.plugin).wdb;
    this.ourLogger = this.logger.context('interlinker');
  }

  async startInterlinking() {
    if (!this.chain.synced) {
      this.ourLogger.info('not synced, waiting for event...');
      await pEvent(node.chain, 'full');
    }
    this.ourLogger.info('starting interlinking');
    this.doInterlink();
    this.on('tip', this.doInterlink);
  }

  // TODO: This should not be needed, but we are currently working around
  // https://github.com/bcoin-org/bcash/issues/95
  async sendMTX(mtx) {
    const wallet = this.walletDB.primary;
    try {
      await wallet.fund(mtx);
    } catch (e) {
      this.ourLogger.error('not enough funds to publish interlink tx');
      this.ourLogger.error('feed me:', await wallet.receiveAddress());
      return; // TODO: replace with InsufficientFundsError
    }
    await wallet.sign(mtx);
    let tx = mtx.toTX();
    await this.walletDB.addTX(tx);
    await this.walletDB.send(tx);
    this.ourLogger.info('sent tx', tx.hash().toString('hex'));
    return tx;
  }

  async doInterlink() {
    const interlink = await this.getInterlinkSinceBlock(MARKED_BLOCK_HASH);
    const hash = interlink.hash();

    this.ourLogger.info('interlink hash =', hash.toString('hex'));
    await this.sendMTX(taggedSPVTx(hash));
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
    this.ourLogger.info('saw', blockCount, 'blocks');
    this.ourLogger.info('last block =', lastBlock.hash.toString('hex'));
    return interlink;
  }
};
