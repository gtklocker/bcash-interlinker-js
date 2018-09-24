'use strict';

const bcash = require('bcash').set('testnet');
const Logger = require('blgr');

//const logger = new Logger({ level: 'info' });

// SPV chains only store the chain headers.
const chain = new bcash.Chain({
  memory: false,
  location: './bcash-bak/spvchain/',
  spv: true,
  //logger,
});

const pool = new bcash.Pool({
  chain: chain,
  spv: true,
  //logger,
});

const WATCH_ADDRESS = bcash.Address.fromString('bchtest:qrmr64sqq9u2ejdk6asf6zkltusukfz7yysf52glwg');
//const CHAIN_RESET_HEIGHT = 1258105;
const CHAIN_RESET_HEIGHT = 1e9;

(async () => {
  //await logger.open();
  await chain.open();
  await pool.open();

  console.log('watch address = %s', WATCH_ADDRESS);

  pool.watchAddress(WATCH_ADDRESS);

  console.log('watch address called');

  await pool.connect();
  pool.startSync();

  pool.on('tx', (tx) => {
    console.log('received tx');
    console.dir(tx, { depth: null });
  });

  chain.on('block', (blk, ch) => {
    if (blk.txs.length > 0) {
      console.log('received block %d with txs', ch.height);
      console.dir(blk.txs, { depth: null });
    }
  });

  if (chain.height > CHAIN_RESET_HEIGHT) {
    console.log('resetting chain to %d', CHAIN_RESET_HEIGHT);
    await chain.reset(CHAIN_RESET_HEIGHT);
  }

  setInterval(() => {
    console.log('chain height = %d', chain.height);
  }, 10000);
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
