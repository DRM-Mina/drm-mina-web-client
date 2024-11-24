import {
  PrivateKey,
  PublicKey,
  Mina,
  UInt64,
  AccountUpdate,
  TokenId,
  fetchAccount,
} from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';

import { DeviceSession } from '../lib/DeviceSessionProof.js';
import dotenv from 'dotenv';
import { mockIdentifiers } from '../test/mock.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';
import { Identifiers } from '../lib/DeviceIdentifier.js';

dotenv.config();

// @ts-ignore

const Network = Mina.Network({
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});
Mina.setActiveInstance(Network);

// @ts-ignore
const AlicePrivateKey = PrivateKey.fromBase58(process.env.ALICE_KEY);
const AlicePubKey = AlicePrivateKey.toPublicKey();

console.time('Compile DeviceIdentifier');
await DeviceIdentifier.compile();
console.timeEnd('Compile DeviceIdentifier');
console.time('Compile DeviceSession');
await DeviceSession.compile();
console.timeEnd('Compile DeviceSession');
console.time('Compile GameToken');
await GameToken.compile();
console.timeEnd('Compile GameToken');
console.time('Compile offchainState');
await offchainState.compile();
console.timeEnd('Compile offchainState');
console.time('Compile DRM');
await DRM.compile();
console.timeEnd('Compile DRM');

// @ts-ignore
const gameTokenPubkey = PublicKey.fromBase58(process.env.GAMETOKEN_ADDRESS_1);
const GameTokenInstance = new GameToken(gameTokenPubkey);

// @ts-ignore
const gameTokenPubkey2 = PublicKey.fromBase58(process.env.GAMETOKEN_ADDRESS_2);
const GameTokenInstance2 = new GameToken(gameTokenPubkey2);

// @ts-ignore
const DRMAddress = PublicKey.fromBase58(process.env.DRM_ADDRESS_1);
const DRMInstance = new DRM(DRMAddress);

DRMInstance.offchainState.setContractInstance(DRMInstance);

// @ts-ignore
const DRMAddress2 = PublicKey.fromBase58(process.env.DRM_ADDRESS_2);
const DRMInstance2 = new DRM(DRMAddress2);

DRMInstance2.offchainState.setContractInstance(DRMInstance2);

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

const AliceDeviceRaw = mockIdentifiers[4];
const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

console.log('Alice Device Identifiers:', AliceDeviceRaw);

console.time('Device identifier proof create');
const deviceIdentifier = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers
);
console.timeEnd('Device identifier proof create');

const gameTokenAddress = await DRMInstance.gameTokenAddress.fetch();
console.log('GameToken address:', gameTokenAddress?.toBase58());

await fetchAccount({
  publicKey: AlicePubKey,
  tokenId: TokenId.derive(gameTokenAddress!),
});
console.log(
  Mina.getBalance(AlicePubKey, TokenId.derive(gameTokenAddress!)).toString()
);

await fetchAccount({
  publicKey: AlicePubKey,
  tokenId: TokenId.derive(gameTokenPubkey),
});

await fetchAccount({
  publicKey: gameTokenPubkey,
});

await fetchAccount({
  // @ts-ignore
  publicKey: DRMAddress,
});

const commitment = await DRMInstance.offchainStateCommitments.fetch();

const actionStateRange = {
  fromActionState: commitment?.actionState,
};

const actions = await Mina.fetchActions(
  // @ts-ignore
  DRMAddress,
  actionStateRange
);

console.log('Actions:', actions);

await Mina.fetchEvents(
  // @ts-ignore
  DRMAddress,
  // @ts-ignore
  TokenId.derive(DRMAddress)
);

let events = await DRMInstance.fetchEvents();
console.log('Events:', events);

const devices = await DRMInstance.offchainState.fields.devices.get(AlicePubKey);

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
        deviceIdentifier.proof,
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

let proof = await DRMInstance.offchainState.createSettlementProof();
console.log('Proof created');
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
  publicKey: DRMAddress,
});

const devices2 = await DRMInstance.offchainState.fields.devices.get(
  AlicePubKey
);

console.log('Devices1:', devices2.value.device_1.toString());
console.log('Devices2:', devices2.value.device_2.toString());
console.log('Devices3:', devices2.value.device_3.toString());
console.log('Devices4:', devices2.value.device_4.toString());

const AliceDeviceRaw2 = mockIdentifiers[4];
const AliceDeviceIdentifiers2 = Identifiers.fromRaw(AliceDeviceRaw2);

console.time('Device identifier proof create');
const deviceIdentifier2 = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers2
);
console.timeEnd('Device identifier proof create');

console.time('Alice registers another device');

const registerDeviceTx2 = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e9,
  },
  async () => {
    await DRMInstance.changeDevice(
      AlicePubKey,
      deviceIdentifier2.proof,
      UInt64.from(4)
    );
  }
);

registerDeviceTx2.sign([AlicePrivateKey]);

await registerDeviceTx2.prove();
let pendingTransaction4 = await registerDeviceTx2.send();

if (pendingTransaction4.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction4.hash}
Waiting for transaction to be included...`
);
await pendingTransaction4.wait();

console.log(`updated state!`);
console.timeEnd('Alice registers another device');

console.time('Setttling');

let proof2 = await DRMInstance.offchainState.createSettlementProof();

const txnProof2 = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e9,
  },
  async () => {
    await DRMInstance.settle(proof2);
  }
);

await txnProof2.prove();
let pendingTransaction5 = await txnProof2.sign([AlicePrivateKey]).send();

if (pendingTransaction5.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction5.hash}
Waiting for transaction to be included...`
);
await pendingTransaction5.wait();

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
  publicKey: DRMAddress,
});

const devices3 = await DRMInstance.offchainState.fields.devices.get(
  AlicePubKey
);

console.log('Devices1:', devices3.value.device_1.toString());
console.log('Devices2:', devices3.value.device_2.toString());
console.log('Devices3:', devices3.value.device_3.toString());
console.log('Devices4:', devices3.value.device_4.toString());

const session = await DRMInstance.offchainState.fields.sessions.get(
  AliceDeviceIdentifiers.hash()
);

console.log('Prev Session:', session.value.toString());

console.time('Alice starts a session');

const deviceSessionProof = await DeviceSession.proofForSession(
  {
    gameToken: gameTokenPubkey,
    currentSessionKey: UInt64.from(1),
    newSessionKey: UInt64.from(20),
  },
  AliceDeviceIdentifiers
);

const sessionTx = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e9,
  },
  async () => {
    await DRMInstance.createSession(deviceSessionProof.proof);
  }
);

sessionTx.sign([AlicePrivateKey]);

await sessionTx.prove();
let pendingTransaction6 = await sessionTx.send();

if (pendingTransaction6.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction6.hash}
Waiting for transaction to be included...`
);
await pendingTransaction6.wait();

console.log(`updated state!`);
console.timeEnd('Alice starts a session');

await fetchAccount({
  publicKey: AlicePubKey,
  tokenId: TokenId.derive(gameTokenPubkey),
});

await fetchAccount({
  publicKey: gameTokenPubkey,
});

await fetchAccount({
  // @ts-ignore
  publicKey: DRMAddress,
});

const session2 = await DRMInstance.offchainState.fields.sessions.get(
  AliceDeviceIdentifiers.hash()
);

console.log('Current Session:', session2.value.toString());

events = await DRMInstance.fetchEvents();
console.log('Events:', events);

console.time('Setttling');

let proof3 = await DRMInstance.offchainState.createSettlementProof();

const txnProof3 = await Mina.transaction(
  {
    sender: AlicePubKey,
    fee: 1e9,
  },
  async () => {
    await DRMInstance.settle(proof3);
  }
);

await txnProof3.prove();
let pendingTransaction7 = await txnProof3.sign([AlicePrivateKey]).send();

if (pendingTransaction7.status === 'rejected') {
  console.log('error sending transaction (see above)');
  process.exit(0);
}

console.log(
  `See transaction at https://minascan.io/devnet/tx/${pendingTransaction7.hash}
Waiting for transaction to be included...`
);
await pendingTransaction7.wait();

console.log(`updated state!`);

console.timeEnd('Setttling');
