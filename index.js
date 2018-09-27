'use strict';

const pEvent = require('p-event');
const InterlinkerNode = require('./InterlinkerNode');
const {fromRev} = require('bcash/lib/utils/util');
const Interlink = require('./Interlink');
const taggedSPVTx = require('./script');

const MARKED_BLOCK_HASH =
  fromRev('00000000000001934669a81ecfaa64735597751ac5ca78c4d8f345f11c2237cf');

async function onTip(node, wallet) {
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

  const tx = taggedSPVTx(interlink.hash());
  try {
    await wallet.fund(tx);
  } catch (e) {
    console.error('not enough funds to publish interlink tx');
    console.error('feed me:', await wallet.receiveAddress());
    return;
  }
  await wallet.sign(tx);
  const finalTx = tx.toTX();
  console.log('final tx =', finalTx);
  try {
    await node.walletDB.addTX(finalTx);
    await node.walletDB.send(finalTx);
  } catch (e) { console.error('error:', e); }
}

(async () => {
  const node = new InterlinkerNode({memory: false, env: true, logLevel: 'info'});
  await node.ensure();
  console.log('prefix =', node.config.prefix);
  console.log('network =', node.chain.network);
  await node.open();
  await node.connect();
  node.startSync();

  const wallet = node.walletDB.primary;

  setInterval(() => {
    console.log('chain height =', node.chain.height);
  }, 5000);


  if (!node.chain.synced) {
    console.log('not synced, waiting for event...');
    await pEvent(node.chain, 'full');
  }

  console.log('cool');

  console.log('* balance = ', await wallet.getBalance());
  wallet.on('balance', async (balance) => {
    console.log('! balance = ', balance);
  });

  await onTip(node, wallet);
  node.chain.on('tip', () => onTip(node, wallet));
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
