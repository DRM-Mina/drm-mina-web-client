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
  TokenId,
  fetchAccount,
} from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';
import { DeviceIdentifier, Identifiers } from '../lib/index.js';
import { DeviceSession } from '../lib/SessionProof.js';
import dotenv from 'dotenv';
import { mockIdentifiers } from '../test/mock.js';

dotenv.config();

const Network = Mina.Network({
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});
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

// @ts-ignore
const gameTokenPubkey = PublicKey.fromBase58(process.env.GAMETOKEN_ADDRESS_1);
const GameTokenInstance = new GameToken(gameTokenPubkey);
/*
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
*/
const AliceDeviceRaw = mockIdentifiers[0];
const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

console.time('Device identifier proof create');
const deviceIdentifier = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers
);
console.timeEnd('Device identifier proof create');

console.time('DRM instance');
const { instance: DRMInstance, offchainState: drmState } = await getDRMInstance(
  // @ts-ignore
  process.env.DRM_ADDRESS_1
);
console.timeEnd('DRM instance');

// const events = await DRMInstance.fetchEvents();
// console.log('Events:', events);

// const gameTokenAddress = await DRMInstance.gameTokenAddress.fetch();
// console.log('GameToken address:', gameTokenAddress?.toBase58());

// const commitment = await DRMInstance.offchainState.fetch();
// console.log('Commitment:', commitment?.toString());

// await fetchAccount({
//   publicKey: AlicePubKey,
//   tokenId: TokenId.derive(gameTokenAddress),
// });
// console.log(
//   Mina.getBalance(AlicePubKey, TokenId.derive(gameTokenAddress)).toString()
// );

await fetchAccount({
  publicKey: AlicePubKey,
  tokenId: TokenId.derive(gameTokenPubkey),
});

await fetchAccount({
  publicKey: gameTokenPubkey,
});

await fetchAccount({
  // @ts-ignore
  publicKey: PublicKey.fromBase58(process.env.DRM_ADDRESS_1),
});

const devices = await (drmState as typeof offchainState).fields.devices.get(
  AlicePubKey
);

console.log('Devices1:', devices.value.device_1.toString());
console.log('Devices2:', devices.value.device_2.toString());
console.log('Devices3:', devices.value.device_3.toString());
console.log('Devices4:', devices.value.device_4.toString());

console.time('Alice registers a device');
try {
  const registerDeviceTx = await Mina.transaction(
    {
      sender: AlicePubKey,
      fee: 1e9,
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
} catch (e) {
  console.log(e);
}
console.timeEnd('Alice registers a device');

console.time('Setttling');

let proof = await drmState.createSettlementProof();

const txnProof = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e9,
  },
  async () => {
    await DRMInstance.settle(proof);
  }
);

await txnProof.prove();
let pendingTransaction3 = await txnProof.sign([AlicePrivateKey]).send();

if (pendingTransaction3.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction3.hash}
Waiting for transaction to be included...`
);
await pendingTransaction3.wait();

console.log(`updated state!`);
console.timeEnd('Setttling');

await fetchAccount({
  publicKey: AlicePubKey,
  tokenId: TokenId.derive(gameTokenPubkey),
});

await fetchAccount({
  publicKey: gameTokenPubkey,
});

await fetchAccount({
  // @ts-ignore
  publicKey: PublicKey.fromBase58(process.env.DRM_ADDRESS_1),
});

const devices2 = await (drmState as typeof offchainState).fields.devices.get(
  AlicePubKey
);

console.log('Devices1:', devices2.value.device_1.toString());
console.log('Devices2:', devices2.value.device_2.toString());
console.log('Devices3:', devices2.value.device_3.toString());
console.log('Devices4:', devices2.value.device_4.toString());
