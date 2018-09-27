'use strict';

const InterlinkerNode = require('./InterlinkerNode');

(async () => {
  const node = new InterlinkerNode({memory: false, env: true, workers: true, logLevel: 'info'});
  await node.ensure();
  console.log('prefix =', node.config.prefix);
  console.log('network =', node.chain.network);
  await node.open();
  await node.connect();
  node.startSync();
  node.startInterlinking();
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
