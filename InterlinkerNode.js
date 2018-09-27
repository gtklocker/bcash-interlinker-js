const bcash = require('bcash');

module.exports = class InterlinkerNode extends bcash.SPVNode {
  constructor(options) {
    super(options);
    this.walletDB = this.use(bcash.wallet.plugin).wdb;
  }
};
