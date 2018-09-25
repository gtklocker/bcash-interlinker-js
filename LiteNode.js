'use strict';

const bcash = require('bcash').set('testnet');

class LiteNode {
  constructor({chainLocation}) {
    this.chain = new bcash.Chain({
      memory: false,
      location: chainLocation,
      spv: true,
    });

    this.pool = new bcash.Pool({
      chain: this.chain,
      spv: true,
    });
  }

  async open() {
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

module.exports = LiteNode;
