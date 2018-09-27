'use strict';

const bcash = require('bcash').set('testnet');
const Logger = require('blgr');

class LiteNode {
  constructor({chainLocation}) {
    this.logger = new Logger({level: 'info'});

    this.chain = new bcash.Chain({
      spv: true,
      memory: false,
      location: chainLocation,
      logger: this.logger,
    });

    this.pool = new bcash.Pool({
      spv: true,
      chain: this.chain,
      logger: this.logger,
    });
  }

  async open() {
    await this.logger.open();
    await this.chain.open();
    await this.pool.open();
  }

  async connect() {
    await this.pool.connect();
  }

  startSync() {
    return this.pool.startSync();
  }

  async startEverything() {
    await this.open();
    await this.connect();
    this.startSync();
  }
}

module.exports = {bcash, LiteNode};
