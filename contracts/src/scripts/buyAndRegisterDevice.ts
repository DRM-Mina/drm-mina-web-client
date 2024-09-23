import {
  PrivateKey,
  PublicKey,
  Mina,
  VerificationKey,
  UInt64,
  UInt32,
  Cache,
  AccountUpdate,
  Field,
  Encoding,
  Signature,
  fetchLastBlock,
  Bool,
  Poseidon,
} from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';
import { DeviceIdentifier, Identifiers } from '../lib/index.js';
import { DeviceSession } from '../lib/SessionProof.js';
import dotenv from 'dotenv';
import { mockIdentifiers } from '../test/mock.js';

dotenv.config();

const Network = Mina.Network(
  'https://api.minascan.io/archive/devnet/v1/graphql'
);
Mina.setActiveInstance(Network);

// @ts-ignore
const AlicePrivateKey = PrivateKey.fromBase58(process.env.ALICE_KEY);
const AlicePubKey = AlicePrivateKey.toPublicKey();

const drmInstances = new Map();

async function getDRMInstance(contractAddress: string) {
  if (drmInstances.has(contractAddress)) {
    return drmInstances.get(contractAddress);
  }

  const instance = new DRM(PublicKey.fromBase58(contractAddress));

  const offchainStateInstance = Object.create(offchainState);
  offchainStateInstance.setContractInstance(instance);

  console.time('Compile OffchainState');
  await offchainStateInstance.compile();
  console.timeEnd('Compile OffchainState');
  console.time('Compile DRM');
  await DRM.compile();
  console.timeEnd('Compile DRM');

  drmInstances.set(contractAddress, {
    instance,
    offchainState: offchainStateInstance,
  });

  return { instance, offchainState: offchainStateInstance };
}

console.time('Compile DeviceIdentifier ');
await DeviceIdentifier.compile();
console.timeEnd('Compile DeviceIdentifier ');
console.time('Compile DeviceSession ');
await DeviceSession.compile();
console.timeEnd('Compile DeviceSession ');
console.time('Compile GameToken ');
await GameToken.compile();
console.timeEnd('Compile GameToken ');

const GameTokenInstance = new GameToken(
  // @ts-ignore
  PublicKey.fromBase58(process.env.GAMETOKEN_ADDRESS_1)
);

console.time('buying game token');
const buyTx = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(AlicePubKey);
    await GameTokenInstance.mintGameToken(AlicePubKey);
  }
);

buyTx.sign([AlicePrivateKey]);

await buyTx.prove();

let pendingTransaction = await buyTx.send();

if (pendingTransaction.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction.hash}
Waiting for transaction to be included...`
);
await pendingTransaction.wait();

console.log(`updated state!`);

console.timeEnd('buying game token');

const AliceDeviceRaw = mockIdentifiers[0];
const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

console.time('Device identifier proof create');
const deviceIdentifier = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers
);
console.timeEnd('Device identifier proof create');

console.time('DRM instance');
const { instance: DRMInstance } = await getDRMInstance(
  // @ts-ignore
  process.env.DRM_ADDRESS_1
);
console.timeEnd('DRM instance');

console.time('Alice registers a device');
const registerDeviceTx = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e8,
  },
  async () => {
    await DRMInstance.initAndAddDevice(
      AlicePubKey,
      deviceIdentifier,
      UInt64.from(1)
    );
  }
);

registerDeviceTx.sign([AlicePrivateKey]);

await registerDeviceTx.prove();
let pendingTransaction2 = await registerDeviceTx.send();

if (pendingTransaction2.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction2.hash}
Waiting for transaction to be included...`
);
await pendingTransaction2.wait();

console.log(`updated state!`);
console.timeEnd('Alice registers a device');
