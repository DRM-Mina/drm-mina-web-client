import {
  PrivateKey,
  Mina,
  UInt64,
  Bool,
  AccountUpdate,
  VerificationKey,
} from 'o1js';
import {
  DRM_MINA_FEE_PERCENTAGE,
  DRM_MINA_PROVIDER_PUB_KEY,
  GameToken,
} from '../GameToken.js';
import { DRM, offchainState } from '../DRM.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';
import { DeviceSession } from '../lib/DeviceSessionProof.js';
import { mockIdentifiers } from './mock.js';
import { Identifiers } from '../lib/DeviceIdentifier.js';
import { BundledDeviceSession } from '../lib/BundledDeviceSessionProof.js';
import { DummyContract } from './Dummy.js';

describe('GameToken Contract Tests', () => {
  const proofsEnabled = true;
  const GAMEPRICE1 = 10000;
  const DISCOUNT1 = 1000;
  const GAMEPRICE2 = 20000;
  const DISCOUNT2 = 2000;
  const TIMEOUTINTERVAL = 100;
  const MAXTREEHEIGHT = 4;

  const AliceDeviceRaw = mockIdentifiers[0];
  const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

  const AliceDeviceRaw2 = mockIdentifiers[1];
  const AliceDeviceIdentifiers2 = Identifiers.fromRaw(AliceDeviceRaw2);

  const AliceDeviceRaw3 = mockIdentifiers[2];
  const AliceDeviceIdentifiers3 = Identifiers.fromRaw(AliceDeviceRaw3);

  const BobDeviceRaw = mockIdentifiers[2];
  const BobDeviceIdentifiers = Identifiers.fromRaw(BobDeviceRaw);

  let localChain: any;
  let publisher: any,
    newPublisher: any,
    alice: any,
    bob: any,
    charlie: any,
    david: any;
  let GameTokenPk1: PrivateKey;
  let GameTokenAddr1: any;
  let GameTokenInstance1: GameToken;

  let GameTokenPk2: PrivateKey;
  let GameTokenAddr2: any;
  let GameTokenInstance2: GameToken;

  let DRMPk1: PrivateKey;
  let DRMAddr1: any;
  let DRMInstance1: DRM;

  let DRMPk2: PrivateKey;
  let DRMAddr2: any;
  let DRMInstance2: DRM;

  let dummyVK: VerificationKey;

  beforeAll(async () => {
    localChain = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits: false,
    });
    Mina.setActiveInstance(localChain);

    [publisher, alice, bob, charlie, david] = localChain.testAccounts;

    GameTokenPk1 = PrivateKey.random();
    GameTokenAddr1 = GameTokenPk1.toPublicKey();
    GameTokenInstance1 = new GameToken(GameTokenAddr1);

    GameTokenPk2 = PrivateKey.random();
    GameTokenAddr2 = GameTokenPk2.toPublicKey();
    GameTokenInstance2 = new GameToken(GameTokenAddr2);

    DRMPk1 = PrivateKey.random();
    DRMAddr1 = DRMPk1.toPublicKey();
    DRMInstance1 = new DRM(DRMAddr1);
    DRMInstance1.offchainState.setContractInstance(DRMInstance1);

    DRMPk2 = PrivateKey.random();
    DRMAddr2 = DRMPk2.toPublicKey();
    DRMInstance2 = new DRM(DRMAddr2);
    DRMInstance2.offchainState.setContractInstance(DRMInstance2);

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
    console.time('Compile DummyContract');
    dummyVK = (await DummyContract.compile()).verificationKey;
    console.timeEnd('Compile DummyContract');
  });

  test('Funding DRM Provider', async () => {
    console.log('Funding DRM Provider ...');
    const fundTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(publisher, 1);
        AccountUpdate.createSigned(publisher).send({
          to: DRM_MINA_PROVIDER_PUB_KEY,
          amount: UInt64.from(1e9),
        });
      }
    );

    fundTx.sign([publisher.key]);

    await fundTx.prove();
    await fundTx.send();

    console.log('DRM Provider funded successfully');
  });

  test('Deploying GameToken and DRM', async () => {
    console.time('Deploying GameToken and DRM');
    const deployTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(publisher, 3);
        await GameTokenInstance1.deploy({
          symbol: 'tokA',
          src: '',
        });
        await GameTokenInstance1.initialize(
          publisher,
          UInt64.from(GAMEPRICE1),
          UInt64.from(DISCOUNT1),
          UInt64.from(TIMEOUTINTERVAL),
          UInt64.from(MAXTREEHEIGHT),
          Bool(false)
        );
        await DRMInstance1.deploy();
        await DRMInstance1.initialize(GameTokenAddr1);
      }
    );

    deployTx.sign([publisher.key, GameTokenPk1, DRMPk1]);

    await deployTx.prove();
    await deployTx.send();
    console.timeEnd('Deploying GameToken and DRM');
  });

  test('Deploying GameToken and DRM2', async () => {
    console.time('Deploying GameToken and DRM2');
    const deployTx2 = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(publisher, 3);
        await GameTokenInstance2.deploy({
          symbol: 'tokB',
          src: '',
        });
        await GameTokenInstance2.initialize(
          publisher,
          UInt64.from(GAMEPRICE2),
          UInt64.from(DISCOUNT2),
          UInt64.from(TIMEOUTINTERVAL),
          UInt64.from(MAXTREEHEIGHT),
          Bool(false)
        );
        await DRMInstance2.deploy();
        await DRMInstance2.initialize(GameTokenAddr2);
      }
    );

    deployTx2.sign([publisher.key, GameTokenPk2, DRMPk2]);

    await deployTx2.prove();
    await deployTx2.send();
    console.timeEnd('Deploying GameToken and DRM2');
  });

  test('Alice buys game 1', async () => {
    console.time('Alice buys a game');

    const aliceMinaBalanceBefore = Mina.getBalance(alice).toBigInt();

    const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceBefore = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    const aliceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(alice);
        await GameTokenInstance1.mintGameToken(alice);
      }
    );

    aliceTx.sign([alice.key]);

    await aliceTx.prove();
    await aliceTx.send();
    console.timeEnd('Alice buys a game ...');

    const aliceMinaBalanceAfter = Mina.getBalance(alice).toBigInt();
    const aliceGameTokenBalanceAfter = await GameTokenInstance1.getBalanceOf(
      alice
    );

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceAfter = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    expect(Number(aliceMinaBalanceBefore - aliceMinaBalanceAfter)).toEqual(
      GAMEPRICE1 - DISCOUNT1 + 1e8 + 1e9
    );

    expect(
      Number(drmProviderMinaBalanceAfter - drmProviderMinaBalanceBefore)
    ).toEqual(
      Math.ceil(((GAMEPRICE1 - DISCOUNT1) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(
      GAMEPRICE1 -
        DISCOUNT1 -
        Math.ceil(((GAMEPRICE1 - DISCOUNT1) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(Number(aliceGameTokenBalanceAfter.toString())).toEqual(1);
  });

  test('Alice registers a device to game 1', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
      AliceDeviceIdentifiers
    );

    let aliceDeviceSession =
      await DRMInstance1.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers.hash()
      );

    console.log(
      'session ',
      aliceDeviceSession.isSome,
      aliceDeviceSession.value.toString()
    );

    expect(aliceDeviceSession.isSome.toBoolean()).toBeFalsy();

    console.timeEnd('Device identifier proof create');
    console.time('Alice registers a device');
    try {
      const registerDeviceTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.initAndAddDevice(
            alice,
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerDeviceTx.sign([alice.key]);

      await registerDeviceTx.prove();
      await registerDeviceTx.send();
    } catch (error) {
      console.log(error);
    }
    console.timeEnd('Alice registers a device');

    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');

    const aliceDevices = await DRMInstance1.offchainState.fields.devices.get(
      alice
    );
    expect(
      aliceDevices.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();

    aliceDeviceSession = await DRMInstance1.offchainState.fields.sessions.get(
      AliceDeviceIdentifiers.hash()
    );

    expect(aliceDeviceSession.isSome).toBeTruthy();
    expect(aliceDeviceSession.value.equals(UInt64.from(1))).toBeTruthy();
  });

  test('Alice buys game 2', async () => {
    console.time('Alice buys a game');

    const aliceMinaBalanceBefore = Mina.getBalance(alice).toBigInt();

    const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceBefore = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    const aliceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(alice);
        await GameTokenInstance2.mintGameToken(alice);
      }
    );

    aliceTx.sign([alice.key]);

    await aliceTx.prove();
    await aliceTx.send();
    console.timeEnd('Alice buys a game ...');

    const aliceMinaBalanceAfter = Mina.getBalance(alice).toBigInt();
    const aliceGameTokenBalanceAfter = await GameTokenInstance2.getBalanceOf(
      alice
    );

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceAfter = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    expect(Number(aliceMinaBalanceBefore - aliceMinaBalanceAfter)).toEqual(
      GAMEPRICE2 - DISCOUNT2 + 1e8 + 1e9
    );

    expect(Number(aliceGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(drmProviderMinaBalanceAfter - drmProviderMinaBalanceBefore)
    ).toEqual(
      Math.ceil(((GAMEPRICE2 - DISCOUNT2) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(
      GAMEPRICE2 -
        DISCOUNT2 -
        Math.ceil(((GAMEPRICE2 - DISCOUNT2) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );
  });

  test('Alice registers a device to game 2', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
      AliceDeviceIdentifiers
    );

    let aliceDeviceSession =
      await DRMInstance2.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers.hash()
      );

    console.log(
      'session ',
      aliceDeviceSession.isSome,
      aliceDeviceSession.value.toString()
    );

    expect(aliceDeviceSession.isSome.toBoolean()).toBeFalsy();

    console.timeEnd('Device identifier proof create');
    console.time('Alice registers a device');
    const registerDeviceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        await DRMInstance2.initAndAddDevice(
          alice,
          deviceIdentifier,
          UInt64.from(1)
        );
      }
    );

    registerDeviceTx.sign([alice.key, DRMPk2]);

    await registerDeviceTx.prove();
    await registerDeviceTx.send();
    console.timeEnd('Alice registers a device');

    console.time('Setttling');

    let proof = await DRMInstance2.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance2.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');

    const aliceDevices = await DRMInstance2.offchainState.fields.devices.get(
      alice
    );
    expect(
      aliceDevices.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();

    aliceDeviceSession = await DRMInstance2.offchainState.fields.sessions.get(
      AliceDeviceIdentifiers.hash()
    );

    expect(aliceDeviceSession.isSome).toBeTruthy();
    expect(aliceDeviceSession.value.equals(UInt64.from(1))).toBeTruthy();
  });

  test('Alice registers another device to game 1', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier2 } = await DeviceIdentifier.proofForDevice(
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
        await DRMInstance1.changeDevice(
          alice,
          deviceIdentifier2,
          UInt64.from(2)
        );
      }
    );

    registerDeviceTx2.sign([alice.key, DRMPk1]);

    await registerDeviceTx2.prove();
    await registerDeviceTx2.send();
    console.timeEnd('Alice registers a device');

    console.time('Setttling');

    const proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof2 = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof2.prove();
    await txnProof2.sign([alice.key]).send();

    console.timeEnd('Setttling');

    const aliceDevices2 = await DRMInstance1.offchainState.fields.devices.get(
      alice
    );
    expect(
      aliceDevices2.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();
    expect(
      aliceDevices2.value.device_2.equals(AliceDeviceIdentifiers2.hash())
    ).toBeTruthy();
  });

  test('Alice registers another device to game 2', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier2 } = await DeviceIdentifier.proofForDevice(
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
        await DRMInstance2.changeDevice(
          alice,
          deviceIdentifier2,
          UInt64.from(2)
        );
      }
    );

    registerDeviceTx2.sign([alice.key, DRMPk2]);

    await registerDeviceTx2.prove();
    await registerDeviceTx2.send();
    console.timeEnd('Alice registers a device');

    console.time('Setttling');

    const proof = await DRMInstance2.offchainState.createSettlementProof();
    const txnProof2 = await Mina.transaction(alice, async () => {
      await DRMInstance2.settle(proof);
    });
    await txnProof2.prove();
    await txnProof2.sign([alice.key]).send();

    console.timeEnd('Setttling');

    const aliceDevices2 = await DRMInstance2.offchainState.fields.devices.get(
      alice
    );
    expect(
      aliceDevices2.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();
    expect(
      aliceDevices2.value.device_2.equals(AliceDeviceIdentifiers2.hash())
    ).toBeTruthy();
  });

  test('Bob trying to register a device without buying a game 1', async () => {
    try {
      console.time('Device identifier proof create');
      const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
        BobDeviceIdentifiers
      );

      console.timeEnd('Device identifier proof create');

      console.time('Bob registers a device');
      const registerDeviceTx = await Mina.transaction(
        {
          sender: bob,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.initAndAddDevice(
            bob,
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk1]);

      await registerDeviceTx.prove();
      await registerDeviceTx.send();
      console.timeEnd('Bob registers a device');
      throw new Error(
        'Bob should not be able to register a device without buying a game'
      );
    } catch (error) {
      console.log('Error expected');
    }
  });

  test('Bob tries to register a device with other methods', async () => {
    try {
      console.time('Device identifier proof create');
      const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
        BobDeviceIdentifiers
      );

      console.timeEnd('Device identifier proof create');

      console.time('Bob registers a device');
      const registerDeviceTx = await Mina.transaction(
        {
          sender: bob,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.changeDevice(
            bob,
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk1]);

      await registerDeviceTx.prove();
      await registerDeviceTx.send();
      console.timeEnd('Bob registers a device');
      throw new Error(
        'Bob should not be able to register a device without buying a game'
      );
    } catch (error) {
      console.log('Error expected');
    }
  });

  test('Bob buys game 1', async () => {
    console.time('Bob buys a game');

    const bobMinaBalanceBefore = Mina.getBalance(bob).toBigInt();

    const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceBefore = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    const bobTx = await Mina.transaction(
      {
        sender: bob,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(bob);
        await GameTokenInstance1.mintGameToken(bob);
      }
    );

    bobTx.sign([bob.key]);

    await bobTx.prove();
    await bobTx.send();
    console.timeEnd('Bob buys a game ...');

    const bobMinaBalanceAfter = Mina.getBalance(bob).toBigInt();
    const bobGameTokenBalanceAfter = await GameTokenInstance1.getBalanceOf(bob);

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceAfter = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    expect(Number(bobMinaBalanceBefore - bobMinaBalanceAfter)).toEqual(
      GAMEPRICE1 - DISCOUNT1 + 1e8 + 1e9
    );

    expect(Number(bobGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(drmProviderMinaBalanceAfter - drmProviderMinaBalanceBefore)
    ).toEqual(
      Math.ceil(((GAMEPRICE1 - DISCOUNT1) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(
      GAMEPRICE1 -
        DISCOUNT1 -
        Math.ceil(((GAMEPRICE1 - DISCOUNT1) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );
  });

  test('Bob registers a device to game 1', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
      BobDeviceIdentifiers
    );

    console.timeEnd('Device identifier proof create');
    console.time('Bob registers a device');
    const registerDeviceTx = await Mina.transaction(
      {
        sender: bob,
        fee: 1e8,
      },
      async () => {
        await DRMInstance1.initAndAddDevice(
          bob,
          deviceIdentifier,
          UInt64.from(1)
        );
      }
    );

    registerDeviceTx.sign([bob.key, DRMPk1]);

    await registerDeviceTx.prove();
    await registerDeviceTx.send();
    console.timeEnd('Bob registers a device');

    console.time('Settling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(bob, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([bob.key]).send();

    console.timeEnd('Settling');

    const bobDevices = await DRMInstance1.offchainState.fields.devices.get(bob);
    expect(
      bobDevices.value.device_1.equals(BobDeviceIdentifiers.hash())
    ).toBeTruthy();
  });

  test('Bob tries to register a device with other methods', async () => {
    try {
      console.time('Device identifier proof create');
      const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
        BobDeviceIdentifiers
      );

      console.timeEnd('Device identifier proof create');

      console.time('Bob registers a device');
      const registerDeviceTx = await Mina.transaction(
        {
          sender: bob,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.changeDevice(
            bob,
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk1]);

      await registerDeviceTx.prove();
      await registerDeviceTx.send();
      console.timeEnd('Bob registers a device');
      throw new Error(
        'Bob should not be able to register a device without buying a game'
      );
    } catch (error) {
      console.log('Error expected');
    }
  });

  test('Alice creates a session to game 1', async () => {
    console.time('Alice creates a session');

    let aliceDeviceSession =
      await DRMInstance1.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers.hash()
      );

    expect(aliceDeviceSession.value.equals(UInt64.from(1))).toBeTruthy();

    const { proof: deviceSessionProof } = await DeviceSession.proofForSession(
      {
        gameToken: GameTokenAddr1,
        currentSessionKey: UInt64.from(1),
        newSessionKey: UInt64.from(20),
      },
      AliceDeviceIdentifiers
    );

    const aliceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        await DRMInstance1.createSession(deviceSessionProof);
      }
    );

    aliceTx.sign([alice.key, DRMPk1]);

    await aliceTx.prove();
    await aliceTx.send();
    console.timeEnd('Alice creates a session');

    aliceDeviceSession = await DRMInstance1.offchainState.fields.sessions.get(
      AliceDeviceIdentifiers.hash()
    );

    expect(aliceDeviceSession.value.equals(UInt64.from(20))).toBeTruthy();
  });

  test('Alice register device 3 in slot 1 in game 1', async () => {
    console.time('Device identifier proof create');
    const { proof: deviceIdentifier } = await DeviceIdentifier.proofForDevice(
      AliceDeviceIdentifiers3
    );

    console.timeEnd('Device identifier proof create');

    console.time('Alice registers a device');
    const registerDeviceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        await DRMInstance1.changeDevice(
          alice,
          deviceIdentifier,
          UInt64.from(1)
        );
      }
    );

    registerDeviceTx.sign([alice.key, DRMPk1]);

    await registerDeviceTx.prove();
    await registerDeviceTx.send();
    console.timeEnd('Alice registers a device');

    console.time('Settling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Settling');

    const aliceDevices = await DRMInstance1.offchainState.fields.devices.get(
      alice
    );
    expect(
      aliceDevices.value.device_1.equals(AliceDeviceIdentifiers3.hash())
    ).toBeTruthy();

    const aliceDeviceSession =
      await DRMInstance1.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers.hash()
      );

    const aliceDeviceSession3 =
      await DRMInstance1.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers3.hash()
      );

    expect(aliceDeviceSession.value.equals(UInt64.from(0))).toBeTruthy();
    expect(aliceDeviceSession3.value.equals(UInt64.from(1))).toBeTruthy();
  });

  test('Alice tries to create a session with deleted device in game 1', async () => {
    try {
      console.time('Alice creates a session');

      let aliceDeviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          AliceDeviceIdentifiers.hash()
        );

      expect(aliceDeviceSession.value.equals(UInt64.from(0))).toBeTruthy();

      const { proof: deviceSessionProof } = await DeviceSession.proofForSession(
        {
          gameToken: GameTokenAddr1,
          currentSessionKey: UInt64.from(0),
          newSessionKey: UInt64.from(20),
        },
        AliceDeviceIdentifiers
      );

      const aliceTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.createSession(deviceSessionProof);
        }
      );

      aliceTx.sign([alice.key, DRMPk1]);

      await aliceTx.prove();
      await aliceTx.send();
      console.timeEnd('Alice creates a session');
      throw new Error('Alice should not be able to create a session');
    } catch (error) {
      console.log('Error expected');
    }
  });

  test('Alice creates a session to game 2', async () => {
    console.time('Alice creates a session');

    let aliceDeviceSession =
      await DRMInstance2.offchainState.fields.sessions.get(
        AliceDeviceIdentifiers.hash()
      );

    expect(aliceDeviceSession.value.equals(UInt64.from(1))).toBeTruthy();

    const { proof: deviceSessionProof } = await DeviceSession.proofForSession(
      {
        gameToken: GameTokenAddr2,
        currentSessionKey: UInt64.from(1),
        newSessionKey: UInt64.from(20),
      },
      AliceDeviceIdentifiers
    );

    const aliceTx = await Mina.transaction(
      {
        sender: alice,
        fee: 1e8,
      },
      async () => {
        await DRMInstance2.createSession(deviceSessionProof);
      }
    );

    aliceTx.sign([alice.key, DRMPk2]);

    await aliceTx.prove();
    await aliceTx.send();
    console.timeEnd('Alice creates a session');

    aliceDeviceSession = await DRMInstance2.offchainState.fields.sessions.get(
      AliceDeviceIdentifiers.hash()
    );

    expect(aliceDeviceSession.value.equals(UInt64.from(20))).toBeTruthy();
  });

  test('Alice tries to change verification key', async () => {
    try {
      const changeVKTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.updateVerificationKey(dummyVK);
        }
      );

      changeVKTx.sign([alice.key]);

      await changeVKTx.prove();
      await changeVKTx.send();
      throw new Error(
        'Alice should not be able to change the verification key'
      );
    } catch (e) {
      console.log('Alice cannot change the verification key as expected');
    }
  });

  test('Publisher tries to change verification key', async () => {
    const changeVKTx = await Mina.transaction(
      {
        sender: newPublisher,
        fee: 1e8,
      },
      async () => {
        await DRMInstance1.updateVerificationKey(dummyVK);
      }
    );

    changeVKTx.sign([newPublisher.key]);

    await changeVKTx.prove();
    await changeVKTx.send();

    let account = Mina.getAccount(DRMAddr1);

    expect(account?.zkapp?.verificationKey?.hash.toBigInt()).toEqual(
      dummyVK.hash.toBigInt()
    );
  });
});
