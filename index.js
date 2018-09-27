'use strict';

const pEvent = require('p-event');
const {bcash, LiteNode} = require('./LiteNode');
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

  const tx = taggedSPVTx(Buffer.from('lol js'));
  await wallet.fund(tx);
  await wallet.sign(tx);
  const finalTx = tx.toTX();
  console.log('final tx =', finalTx);
  try {
    await node.pool.broadcast(finalTx);
  } catch (e) { console.err('error:', e); }
}

const path = require('path');
const CHAIN_LOCATION = path.join('.', 'bcash-bak', 'spvchain');
const WALLET_LOCATION = path.join(process.env.HOME, '.bcash', 'testnet', 'wallet');

(async () => {
  const node = new LiteNode({chainLocation: CHAIN_LOCATION});
  const walletdb = new bcash.wallet.WalletDB({memory: false, spv: true, location: WALLET_LOCATION});
  await node.open();
  await walletdb.open();

  const wallet = await walletdb.get('primary');
  const addrToWatch = await wallet.receiveAddress();
  console.log('watching address', addrToWatch);
  node.pool.watchAddress(addrToWatch);

  node.pool.on('tx', async (tx) => {
    try {
      console.log('received tx');
      await walletdb.addTX(tx);
    } catch (e) { console.error('error:', e); }
  });

  await node.connect();
  node.startSync();

  //console.log('wallets =', await walletdb.getWallets());
  //const accounts = await wallet.getAccounts();
  //console.log('accounts =', accounts);

  setInterval(() => {
    console.log('chain height =', node.chain.height);
  }, 5000);


  if (!node.chain.synced) {
    console.log('not synced, waiting for event...');
    await pEvent(node.chain, 'full');
  }

  console.log('wallet balance =', await wallet.getBalance());

  wallet.on('balance', async (balance) => {
    console.log('got new balance =', balance);
  });

  await onTip(node, wallet);
  node.chain.on('tip', () => onTip(node, wallet));
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
