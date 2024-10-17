// import {
//   PrivateKey,
//   PublicKey,
//   Mina,
//   VerificationKey,
//   UInt64,
//   UInt32,
//   Cache,
//   AccountUpdate,
//   Field,
//   Encoding,
//   Signature,
//   fetchLastBlock,
//   Bool,
//   Poseidon,
// } from 'o1js';
// import { DRM, offchainState } from '../DRM.js';
// import { GameToken } from '../GameToken.js';
// import { mockIdentifiers } from './mock.js';
// import { DeviceIdentifier, Identifiers } from '../lib/index.js';
// import { DeviceSession } from '../lib/DeviceSessionProof.js';

// const proofsEnabled = true;

// const GAMEPRICE = 10000;
// const DISCOUNT = 1000;
// const TIMEOUTINTERVAL = 100;
// const MAXTREEHEIGHT = 4;

// const localChain = await Mina.LocalBlockchain({
//   proofsEnabled,
//   enforceTransactionLimits: false,
// });
// Mina.setActiveInstance(localChain);

// const [publisher, alice, bob, charlie, david] = localChain.testAccounts;

// const GameTokenPk = PrivateKey.random();
// const GameTokenAddr = GameTokenPk.toPublicKey();
// const GameTokenPk2 = PrivateKey.random();
// const GameTokenAddr2 = GameTokenPk2.toPublicKey();

// const DRMPk = PrivateKey.random();
// const DRMAddr = DRMPk.toPublicKey();
// const DRMPk2 = PrivateKey.random();
// const DRMAddr2 = DRMPk2.toPublicKey();

// const GameTokenInstance = new GameToken(GameTokenAddr);
// const GameTokenInstance2 = new GameToken(GameTokenAddr2);
// const DRMInstance = new DRM(DRMAddr);
// const DRMInstance2 = new DRM(DRMAddr2);

// console.time('Compile DeviceIdentifier ');
// const DeviceIdentifierCache: Cache = Cache.FileSystem(
//   './cache/deviceIdentifierCache'
// );
// // await DeviceIdentifier.compile({ cache: DeviceIdentifierCache });
// await DeviceIdentifier.compile();
// console.timeEnd('Compile DeviceIdentifier ');
// console.time('Compile DeviceSession ');
// const DeviceSessionCache: Cache = Cache.FileSystem(
//   './cache/deviceSessionCache'
// );
// // await DeviceSession.compile({ cache: DeviceSessionCache });
// await DeviceSession.compile();
// console.timeEnd('Compile DeviceSession ');
// console.time('Compile GameToken ');
// const GameTokenCache: Cache = Cache.FileSystem('./cache/gameTokenCache');
// // await GameToken.compile({ cache: GameTokenCache });
// await GameToken.compile();
// console.timeEnd('Compile GameToken ');
// console.time('Compile offchainState ');
// await offchainState.compile();
// console.timeEnd('Compile offchainState ');
// console.time('Compile DRM ');
// const DRMCache: Cache = Cache.FileSystem('./cache/drmCache');
// // await DRM.compile({ cache: DRMCache });
// await DRM.compile();
// console.timeEnd('Compile DRM ');

// console.time('Deploying GameToken and DRM');
// const deployTx = await Mina.transaction(
//   {
//     sender: publisher,
//     fee: 1e8,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(publisher, 3);
//     await GameTokenInstance.deploy({
//       symbol: 'tokA',
//       src: '',
//     });
//     await GameTokenInstance.initialize(
//       publisher,
//       UInt64.from(GAMEPRICE),
//       UInt64.from(DISCOUNT),
//       UInt64.from(TIMEOUTINTERVAL),
//       UInt64.from(MAXTREEHEIGHT),
//       Bool(false)
//     );
//     await DRMInstance.deploy();
//     await DRMInstance.initialize(GameTokenAddr);
//   }
// );

// deployTx.sign([publisher.key, GameTokenPk, DRMPk]);

// await deployTx.prove();
// await deployTx.send();
// console.timeEnd('Deploying GameToken and DRM');

// offchainState.setContractInstance(DRMInstance2);

// console.time('Deploying GameToken and DRM2');
// const deployTx2 = await Mina.transaction(
//   {
//     sender: publisher,
//     fee: 1e8,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(publisher, 3);
//     await GameTokenInstance2.deploy({
//       symbol: 'tokB',
//       src: '',
//     });
//     await GameTokenInstance2.initialize(
//       publisher,
//       UInt64.from(GAMEPRICE),
//       UInt64.from(DISCOUNT),
//       UInt64.from(TIMEOUTINTERVAL),
//       UInt64.from(MAXTREEHEIGHT),
//       Bool(false)
//     );
//     await DRMInstance2.deploy();
//     await DRMInstance2.initialize(GameTokenAddr2);
//   }
// );

// deployTx2.sign([publisher.key, GameTokenPk2, DRMPk2]);

// await deployTx2.prove();
// await deployTx2.send();
// console.timeEnd('Deploying GameToken and DRM2');

// offchainState.setContractInstance(DRMInstance);

// console.time('Alice buys a game');

// const aliceMinaBalanceBefore = Mina.getBalance(alice).toBigInt();
// const aliceGameTokenBalanceBefore = await GameTokenInstance.getBalanceOf(alice);

// const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

// const aliceTx = await Mina.transaction(
//   {
//     sender: alice,
//     fee: 1e8,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(alice);
//     await GameTokenInstance.mintGameToken(alice);
//   }
// );

// aliceTx.sign([alice.key]);

// await aliceTx.prove();
// await aliceTx.send();
// console.timeEnd('Alice buys a game');

// const aliceMinaBalanceAfter = Mina.getBalance(alice).toBigInt();
// const aliceGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(alice);

// const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

// console.log('Alice Mina balance before:', aliceMinaBalanceBefore);
// console.log('Alice Mina balance after:', aliceMinaBalanceAfter);
// console.log(
//   'Alice Mina balance diff:',
//   aliceMinaBalanceAfter - aliceMinaBalanceBefore
// );

// console.log(
//   'Alice GameToken balance before:',
//   aliceGameTokenBalanceBefore.toString()
// );
// console.log(
//   'Alice GameToken balance after:',
//   aliceGameTokenBalanceAfter.toString()
// );

// console.log('Publisher Mina balance before:', publisherMinaBalanceBefore);
// console.log('Publisher Mina balance after:', publisherMinaBalanceAfter);
// console.log(
//   'Publisher Mina balance diff:',
//   publisherMinaBalanceAfter - publisherMinaBalanceBefore
// );

// console.time('Alice buys a game2');

// const aliceMinaBalanceBefore2 = Mina.getBalance(alice).toBigInt();
// const aliceGameTokenBalanceBefore2 = await GameTokenInstance2.getBalanceOf(
//   alice
// );

// const publisherMinaBalanceBefore2 = Mina.getBalance(publisher).toBigInt();

// const aliceTx2 = await Mina.transaction(
//   {
//     sender: alice,
//     fee: 1e8,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(alice);
//     await GameTokenInstance2.mintGameToken(alice);
//   }
// );

// aliceTx2.sign([alice.key]);

// await aliceTx2.prove();
// await aliceTx2.send();
// console.timeEnd('Alice buys a game2');

// const aliceMinaBalanceAfter2 = Mina.getBalance(alice).toBigInt();
// const aliceGameTokenBalanceAfter2 = await GameTokenInstance2.getBalanceOf(
//   alice
// );

// const publisherMinaBalanceAfter2 = Mina.getBalance(publisher).toBigInt();

// console.log('Alice Mina balance before:', aliceMinaBalanceBefore2);
// console.log('Alice Mina balance after:', aliceMinaBalanceAfter2);

// console.log(
//   'Alice GameToken balance before:',
//   aliceGameTokenBalanceBefore2.toString()
// );

// console.log(
//   'Alice GameToken balance after:',
//   aliceGameTokenBalanceAfter2.toString()
// );

// console.log('Publisher Mina balance before:', publisherMinaBalanceBefore2);

// console.log('Publisher Mina balance after:', publisherMinaBalanceAfter2);

// const AliceDeviceRaw = mockIdentifiers[0];
// const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

// console.time('Device identifier proof create');
// const deviceIdentifier = await DeviceIdentifier.proofForDevice(
//   AliceDeviceIdentifiers
// );

// console.timeEnd('Device identifier proof create');
// console.time('Alice registers a device');
// const registerDeviceTx = await Mina.transaction(
//   {
//     sender: alice,
//     fee: 1e8,
//   },
//   async () => {
//     await DRMInstance.initAndAddDevice(alice, deviceIdentifier, UInt64.from(1));
//   }
// );

// registerDeviceTx.sign([alice.key, DRMPk]);

// await registerDeviceTx.prove();
// await registerDeviceTx.send();
// console.timeEnd('Alice registers a device');

// console.time('Setttling');

// let proof = await offchainState.createSettlementProof();
// const txnProof = await Mina.transaction(alice, async () => {
//   await DRMInstance.settle(proof);
// });
// await txnProof.prove();
// await txnProof.sign([alice.key]).send();

// console.timeEnd('Setttling');

// const aliceDevices = await offchainState.fields.devices.get(alice);
// console.log('Alice devices:', aliceDevices.value.device_1.toString());

// console.log('Other DRM instance');
// offchainState.setContractInstance(DRMInstance2);
// offchainState.compile();

// const AliceDeviceRaw2 = mockIdentifiers[1];
// const AliceDeviceIdentifiers2 = Identifiers.fromRaw(AliceDeviceRaw2);

// console.time('Device identifier proof create');
// const deviceIdentifier2 = await DeviceIdentifier.proofForDevice(
//   AliceDeviceIdentifiers2
// );

// console.timeEnd('Device identifier proof create');

// console.time('Alice registers a device');
// const registerDeviceTx2 = await Mina.transaction(
//   {
//     sender: alice,
//     fee: 1e8,
//   },
//   async () => {
//     await DRMInstance2.changeDevice(alice, deviceIdentifier2, UInt64.from(2));
//   }
// );

// registerDeviceTx2.sign([alice.key, DRMPk]);

// await registerDeviceTx2.prove();
// await registerDeviceTx2.send();
// console.timeEnd('Alice registers a device');

// console.time('Setttling');

// proof = await offchainState.createSettlementProof();
// const txnProof2 = await Mina.transaction(alice, async () => {
//   await DRMInstance2.settle(proof);
// });
// await txnProof2.prove();
// await txnProof2.sign([alice.key]).send();

// console.timeEnd('Setttling');

// const aliceDevices2 = await offchainState.fields.devices.get(alice);
// console.log(
//   'Alice devices:',
//   aliceDevices2.value.device_1.toString(),
//   aliceDevices2.value.device_2.toString()
// );

// const AliceDeviceRaw3 = mockIdentifiers[2];
// const AliceDeviceIdentifiers3 = Identifiers.fromRaw(AliceDeviceRaw3);

// console.time('Device identifier proof create');
// const deviceIdentifier3 = await DeviceIdentifier.proofForDevice(
//   AliceDeviceIdentifiers3
// );

// console.timeEnd('Device identifier proof create');

// console.time('Alice registers a device');
// const registerDeviceTx3 = await Mina.transaction(
//   {
//     sender: alice,
//     fee: 1e8,
//   },
//   async () => {
//     await DRMInstance.changeDevice(alice, deviceIdentifier3, UInt64.from(3));
//   }
// );

// registerDeviceTx3.sign([alice.key, DRMPk]);

// await registerDeviceTx3.prove();
// await registerDeviceTx3.send();
// console.timeEnd('Alice registers a device');

// console.time('Setttling');

// proof = await offchainState.createSettlementProof();
// const txnProof3 = await Mina.transaction(alice, async () => {
//   await DRMInstance.settle(proof);
// });
// await txnProof3.prove();
// await txnProof3.sign([alice.key]).send();

// console.timeEnd('Setttling');
