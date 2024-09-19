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
import { mockIdentifiers } from './mock.js';
import { DeviceIdentifier, Identifiers } from '../lib/index.js';
import { DeviceSession } from '../lib/SessionProof.js';

const proofsEnabled = true;

const GAMEPRICE = 10000;
const DISCOUNT = 1000;
const TIMEOUTINTERVAL = 100;
const MAXTREEHEIGHT = 4;

const localChain = await Mina.LocalBlockchain({
  proofsEnabled,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(localChain);

const [publisher, alice, bob, charlie, david] = localChain.testAccounts;

const GameTokenPk = PrivateKey.random();
const GameTokenAddr = GameTokenPk.toPublicKey();

const DRMPk = PrivateKey.random();
const DRMAddr = DRMPk.toPublicKey();

const GameTokenInstance = new GameToken(GameTokenAddr);
const DRMInstance = new DRM(DRMAddr);

offchainState.setContractInstance(DRMInstance);

console.time('Compile DeviceIdentifier ');
await DeviceIdentifier.compile();
console.timeEnd('Compile DeviceIdentifier ');
console.time('Compile DeviceSession ');
await DeviceSession.compile();
console.timeEnd('Compile DeviceSession ');
console.time('Compile GameToken ');
await GameToken.compile();
console.timeEnd('Compile GameToken ');
console.time('Compile offchainState ');
await offchainState.compile();
console.timeEnd('Compile offchainState ');
console.time('Compile DRM ');
await DRM.compile();
console.timeEnd('Compile DRM ');

console.time('Deploying GameToken and DRM');
const deployTx = await Mina.transaction(
  {
    sender: publisher,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(publisher, 3);
    await GameTokenInstance.deploy({
      symbol: 'tokA',
      src: '',
    });
    await GameTokenInstance.initialize(
      publisher,
      UInt64.from(GAMEPRICE),
      UInt64.from(DISCOUNT),
      UInt64.from(TIMEOUTINTERVAL),
      UInt64.from(MAXTREEHEIGHT),
      Bool(false)
    );
    await DRMInstance.deploy();
    await DRMInstance.initialize(GameTokenAddr);
  }
);

deployTx.sign([publisher.key, GameTokenPk, DRMPk]);

await deployTx.prove();
await deployTx.send();
console.timeEnd('Deploying GameToken and DRM ');

console.time('Alice buys a game');

const aliceMinaBalanceBefore = Mina.getBalance(alice).toBigInt();
const aliceGameTokenBalanceBefore = await GameTokenInstance.getBalanceOf(alice);

const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

const aliceTx = await Mina.transaction(
  {
    sender: alice,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(alice);
    await GameTokenInstance.mintGameToken(alice);
  }
);

aliceTx.sign([alice.key]);

await aliceTx.prove();
await aliceTx.send();
console.timeEnd('Alice buys a game ...');

const aliceMinaBalanceAfter = Mina.getBalance(alice).toBigInt();
const aliceGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(alice);

const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

console.log('Alice Mina balance before:', aliceMinaBalanceBefore);
console.log('Alice Mina balance after:', aliceMinaBalanceAfter);
console.log(
  'Alice Mina balance diff:',
  aliceMinaBalanceAfter - aliceMinaBalanceBefore
);

console.log(
  'Alice GameToken balance before:',
  aliceGameTokenBalanceBefore.toString()
);
console.log(
  'Alice GameToken balance after:',
  aliceGameTokenBalanceAfter.toString()
);

console.log('Publisher Mina balance before:', publisherMinaBalanceBefore);
console.log('Publisher Mina balance after:', publisherMinaBalanceAfter);
console.log(
  'Publisher Mina balance diff:',
  publisherMinaBalanceAfter - publisherMinaBalanceBefore
);

const AliceDeviceRaw = mockIdentifiers[0];
const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

console.time('Device identifier proof create');
const deviceIdentifier = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers
);

console.timeEnd('Device identifier proof create');
console.time('Alice registers a device');
const registerDeviceTx = await Mina.transaction(
  {
    sender: alice,
    fee: 1e8,
  },
  async () => {
    await DRMInstance.initAndAddDevice(alice, deviceIdentifier, UInt64.from(1));
  }
);

registerDeviceTx.sign([alice.key, DRMPk]);

await registerDeviceTx.prove();
await registerDeviceTx.send();
console.timeEnd('Alice registers a device');

console.time('Setttling');

let proof = await offchainState.createSettlementProof();
const txnProof = await Mina.transaction(alice, async () => {
  await DRMInstance.settle(proof);
});
await txnProof.prove();
await txnProof.sign([alice.key]).send();

console.timeEnd('Setttling');

const aliceDevices = await offchainState.fields.devices.get(alice);
console.log('Alice devices:', aliceDevices.value.device_1.toString());

const AliceDeviceRaw2 = mockIdentifiers[1];
const AliceDeviceIdentifiers2 = Identifiers.fromRaw(AliceDeviceRaw2);

console.time('Device identifier proof create');
const deviceIdentifier2 = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers2
);

console.timeEnd('Device identifier proof create');

console.time('Alice registers a device');
const registerDeviceTx2 = await Mina.transaction(
  {
    sender: alice,
    fee: 1e8,
  },
  async () => {
    await DRMInstance.changeDevice(alice, deviceIdentifier2, UInt64.from(2));
  }
);

registerDeviceTx2.sign([alice.key, DRMPk]);

await registerDeviceTx2.prove();
await registerDeviceTx2.send();
console.timeEnd('Alice registers a device');

console.time('Setttling');

proof = await offchainState.createSettlementProof();
const txnProof2 = await Mina.transaction(alice, async () => {
  await DRMInstance.settle(proof);
});
await txnProof2.prove();
await txnProof2.sign([alice.key]).send();

console.timeEnd('Setttling');

const aliceDevices2 = await offchainState.fields.devices.get(alice);
console.log(
  'Alice devices:',
  aliceDevices2.value.device_1.toString(),
  aliceDevices2.value.device_2.toString()
);
