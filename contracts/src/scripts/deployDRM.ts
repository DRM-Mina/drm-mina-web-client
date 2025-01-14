import {
  PrivateKey,
  Mina,
  UInt64,
  AccountUpdate,
  Bool,
  fetchAccount,
} from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';
import { DeviceSession } from '../lib/DeviceSessionProof.js';
import dotenv from 'dotenv';
import { BundledDeviceSession } from '../lib/BundledDeviceSessionProof.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';

dotenv.config();

const Network = Mina.Network({
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});
Mina.setActiveInstance(Network);

// @ts-ignore
const publisherPrivateKey = PrivateKey.fromBase58(process.env.PUBLISHER_KEY);
const publisherPubKey = publisherPrivateKey.toPublicKey();
const { account } = await fetchAccount({
  publicKey: publisherPubKey,
});

let nonce = Number(account!.nonce.toBigint());

console.log(publisherPubKey.toBase58());

const SYMBOLS = ['DIMND', 'KINDA', 'DEMO'];
const GAMETOKENSOURCE =
  'https://github.com/DRM-Mina/drm-mina-web-client/blob/main/contracts/src/GameToken.ts';
const DRMSOURCE =
  'https://github.com/DRM-Mina/drm-mina-web-client/blob/main/contracts/src/DRM.ts';
const GAMEPRICE = [10_000_000_000, 20_000_000_000, 15_000_000_000];
const DISCOUNT = [2_000_000_000, 0, 5_000_000_000];
const TIMEOUTINTERVAL = 10000;
const MAXDEVICEALLOWED = 4;

console.time('Compile DeviceIdentifier');
await DeviceIdentifier.compile();
console.timeEnd('Compile DeviceIdentifier');
console.time('Compile DeviceSession');
await DeviceSession.compile();
console.timeEnd('Compile DeviceSession');
console.time('Compile BundledDeviceSession');
await BundledDeviceSession.compile();
console.timeEnd('Compile BundledDeviceSession');
console.time('Compile GameToken');
await GameToken.compile();
console.timeEnd('Compile GameToken');
console.time('Compile offchainState');
await offchainState.compile();
console.timeEnd('Compile offchainState');
console.time('Compile DRM');
await DRM.compile();
console.timeEnd('Compile DRM');

const pendingTransactions = [];

for (let i = 0; i < 3; i++) {
  const GameTokenPk = PrivateKey.random();
  const GameTokenAddr = GameTokenPk.toPublicKey();
  const GameTokenInstance = new GameToken(GameTokenAddr);

  const DRMPk = PrivateKey.random();
  const DRMAddr = DRMPk.toPublicKey();
  const DRMInstance = new DRM(DRMAddr);
  DRMInstance.offchainState.setContractInstance(DRMInstance);

  console.time(`Deploying ${i}`);
  console.log(`GameToken ${i} pk: ${GameTokenPk.toBase58()}`);
  console.log(`DRM ${i} pk: ${DRMPk.toBase58()}`);
  const deployTx = await Mina.transaction(
    {
      sender: publisherPubKey,
      fee: 1e8,
      nonce: nonce++,
      memo: `DRM Mina Deploy`,
    },
    async () => {
      AccountUpdate.fundNewAccount(publisherPubKey, 3);
      await GameTokenInstance.deploy({
        symbol: SYMBOLS[i],
        src: GAMETOKENSOURCE,
      });
      await GameTokenInstance.initialize(
        publisherPubKey,
        UInt64.from(GAMEPRICE[i]),
        UInt64.from(DISCOUNT[i]),
        UInt64.from(TIMEOUTINTERVAL),
        UInt64.from(MAXDEVICEALLOWED),
        Bool(false)
      );
      await DRMInstance.deploy({
        symbol: SYMBOLS[i],
        src: DRMSOURCE,
      });
      await DRMInstance.initialize(GameTokenAddr);
    }
  );
  deployTx.sign([publisherPrivateKey, GameTokenPk, DRMPk]);

  await deployTx.prove();

  let pendingTransaction = await deployTx.send();

  if (pendingTransaction.status === 'rejected') {
    console.log('error sending transaction (see above)');
    process.exit(0);
  }

  console.log(
    `See transaction at https://minascan.io/devnet/tx/${pendingTransaction.hash}`
  );

  pendingTransactions.push(
    pendingTransaction
      .wait()
      .then(() => {
        console.log(`Transaction ${i} included successfully.`);
        console.log(`GameToken deployed at ${GameTokenAddr.toBase58()}`);
        console.log(`DRM deployed at ${DRMAddr.toBase58()}`);
        console.timeEnd(`Deploying ${i}`);
      })
      .catch((error) => {
        console.error(`Transaction ${i} failed to be included:`, error);
        console.timeEnd(`Deploying ${i}`);
      })
  );

  console.log(`Transaction ${i} sent, waiting for inclusion...`);
}

await Promise.all(pendingTransactions);

console.log('All transactions have been processed.');
