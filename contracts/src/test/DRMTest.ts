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
const MAXTREEHEIGHT = 2;

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

await DeviceIdentifier.compile();
await DeviceSession.compile();
console.log('Compiling GameToken ...');
await GameToken.compile();
console.log('Compiling offchainState ...');
await offchainState.compile();
console.log('Compiling DRM ...');
await DRM.compile();

console.log('Deploying GameToken and DRM ...');
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

console.log('Alice buys a game ...');

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

console.log('Alice registers a device ...');

const deviceIdentifier = await DeviceIdentifier.proofForDevice(
  AliceDeviceIdentifiers
);

console.log('Device identifier proof created');

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

console.log('Setttling ...');

let proof = await offchainState.createSettlementProof();
const txnProof = await Mina.transaction(alice, async () => {
  await DRMInstance.settle(proof);
});
await txnProof.prove();
await txnProof.sign([alice.key]).send();

const aliceDevices = await offchainState.fields.devices.get(alice);
console.log('Alice devices:', aliceDevices.value.device_1.toString());
