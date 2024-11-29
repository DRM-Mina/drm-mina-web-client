import { PrivateKey, Mina, UInt64, AccountUpdate, Bool } from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';
import { DeviceSession } from '../lib/DeviceSessionProof.js';
import dotenv from 'dotenv';
import { BundledDeviceSession } from '../lib/BundledDeviceSessionProof.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';

dotenv.config();

const MINA_NODE_URL =
  process.env.MINA_NODE_URL || 'https://api.minascan.io/node/devnet/v1/graphql';
const MINA_ARCHIVE_URL =
  process.env.MINA_ARCHIVE_URL ||
  'https://api.minascan.io/archive/devnet/v1/graphql';

const GAME_TOKEN_NAME = process.env.GAME_TOKEN_NAME || 'DRM';

const Network = Mina.Network({
  mina: MINA_NODE_URL,
  archive: MINA_ARCHIVE_URL,
});
Mina.setActiveInstance(Network);

// @ts-ignore
const publisherPrivateKey = PrivateKey.fromBase58(process.env.PUBLISHER_KEY);
const publisherPubKey = publisherPrivateKey.toPublicKey();

console.log('Publisher: ', publisherPubKey.toBase58());

const GAMEPRICE = process.env.GAMEPRICE || 0;
const DISCOUNT = process.env.DISCOUNT || 0;
const TIMEOUTINTERVAL = process.env.TIMEOUTINTERVAL || 600000;
const MAXDEVICEALLOWED = process.env.MAXDEVICEALLOWED || 4;

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

const GameTokenPk = PrivateKey.random();
const GameTokenAddr = GameTokenPk.toPublicKey();
const GameTokenInstance = new GameToken(GameTokenAddr);

const DRMPk = PrivateKey.random();
const DRMAddr = DRMPk.toPublicKey();
const DRMInstance = new DRM(DRMAddr);
DRMInstance.offchainState.setContractInstance(DRMInstance);

console.log('Creating Transaction...');
const deployTx = await Mina.transaction(
  {
    sender: publisherPubKey,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(publisherPubKey, 3);
    await GameTokenInstance.deploy({
      symbol: GAME_TOKEN_NAME,
      src: 'https://github.com/DRM-Mina/drm-mina-web-client/blob/main/contracts/src/GameToken.ts',
    });
    await GameTokenInstance.initialize(
      publisherPubKey,
      UInt64.from(GAMEPRICE),
      UInt64.from(DISCOUNT),
      UInt64.from(TIMEOUTINTERVAL),
      UInt64.from(MAXDEVICEALLOWED),
      Bool(false)
    );
    await DRMInstance.deploy({
      symbol: GAME_TOKEN_NAME,
      src: 'https://github.com/DRM-Mina/drm-mina-web-client/blob/main/contracts/src/DRM.ts',
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

try {
  await pendingTransaction.wait();
  console.log(`Transaction included successfully.`);
  console.log(`GameToken deployed at ${GameTokenAddr.toBase58()}`);
  console.log(`DRM deployed at ${DRMAddr.toBase58()}`);
} catch (error) {
  console.error(`Transaction failed to be included:`, error);
}

process.exit(0);
