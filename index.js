'use strict';

const pEvent = require('p-event');
const LiteNode = require('./LiteNode');
const { util } = require('bcash');
const Interlink = require('./Interlink');

const MARKED_BLOCK_HASH =
  util.fromRev('00000000000001934669a81ecfaa64735597751ac5ca78c4d8f345f11c2237cf');

async function onTip(node) {
  const interlink = new Interlink();
  let blk = await node.chain.getEntryByHash(MARKED_BLOCK_HASH);
  let blockCount = 0;
  let lastBlock = blk;
  while (blk) {
    ++blockCount;
    lastBlock = blk;
    interlink.update(blk.hash);
    blk = await node.chain.getNextEntry(blk);
  }
  console.log('saw', blockCount, 'blocks');
  console.log('last block =', lastBlock);
  console.log('interlink hash =', interlink.hash());
}

(async () => {
  const node = new LiteNode({chainLocation: './bcash-bak/spvchain/'});
  await node.open();
  await node.connect();
  node.startSync();

  if (!node.chain.synced) {
    console.log('not synced, waiting for event...');
    await pEvent(node.chain, 'full');
  }

  await onTip(node);
  node.chain.on('tip', () => onTip(node));
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
