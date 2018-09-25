'use strict';

const pEvent = require('p-event');
const LiteNode = require('./LiteNode');
const bcash = require('bcash').set('testnet');
const { fromRev } = require('bcash/lib/utils/util');
const Interlink = require('./Interlink');
const taggedSPVTx = require('./script');

const MARKED_BLOCK_HASH =
  fromRev('00000000000001934669a81ecfaa64735597751ac5ca78c4d8f345f11c2237cf');

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

const path = require('path');
const WALLET_LOCATION = path.join(process.env.HOME, '.bcash', 'testnet', 'wallet');

(async () => {
  const node = new LiteNode({chainLocation: './bcash-bak/spvchain/'});
  const walletdb = new bcash.wallet.WalletDB({location: WALLET_LOCATION, spv: true});
  await node.open();
  await node.connect();
  node.startSync();

  await walletdb.open();
  console.log(walletdb.options.location);
  console.log(walletdb.options.spv);
  console.log('wallets =', await walletdb.getWallets());
  const wallet = await walletdb.get('primary');
  const account = await wallet.getAccount('default');
  const accounts = await wallet.getAccounts();
  console.log('accounts =', accounts);
  console.log('receive address =', account.receiveAddress());

  if (!node.chain.synced) {
    console.log('not synced, waiting for event...');
    await pEvent(node.chain, 'full');
  }

  wallet.once('balance', async (balance) => {
    console.log('got balance');
    const tx = taggedSPVTx(Buffer.from('lol js'));
    const fundedTx = await wallet.fund(tx);
    console.log({fundedTx});
  });
    /*

  await onTip(node);
  node.chain.on('tip', () => onTip(node));
  */
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
