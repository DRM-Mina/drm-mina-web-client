import { PrivateKey, Mina, UInt64, Bool, AccountUpdate } from 'o1js';
import { GameToken } from '../GameToken.js';
import { DRM, offchainState } from '../DRM.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';
import { DeviceSession } from '../lib/SessionProof.js';
import { mockIdentifiers } from './mock.js';
import { Identifiers } from '../lib/DeviceIdentifier.js';

describe('GameToken Contract Tests', () => {
  const proofsEnabled = false;
  const GAMEPRICE = 10000;
  const DISCOUNT = 1000;
  const TIMEOUTINTERVAL = 100;
  const MAXTREEHEIGHT = 4;

  const AliceDeviceRaw = mockIdentifiers[0];
  const AliceDeviceIdentifiers = Identifiers.fromRaw(AliceDeviceRaw);

  const AliceDeviceRaw2 = mockIdentifiers[1];
  const AliceDeviceIdentifiers2 = Identifiers.fromRaw(AliceDeviceRaw2);

  const BobDeviceRaw = mockIdentifiers[2];
  const BobDeviceIdentifiers = Identifiers.fromRaw(BobDeviceRaw);

  let localChain: any;
  let publisher: any, alice: any, bob: any, charlie: any, david: any;
  let GameTokenPk: PrivateKey;
  let GameTokenAddr: any;
  let GameTokenInstance: GameToken;
  let DRMPk: PrivateKey;
  let DRMAddr: any;
  let DRMInstance: DRM;

  beforeAll(async () => {
    localChain = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits: false,
    });
    Mina.setActiveInstance(localChain);

    [publisher, alice, bob, charlie, david] = localChain.testAccounts;

    GameTokenPk = PrivateKey.random();
    GameTokenAddr = GameTokenPk.toPublicKey();
    GameTokenInstance = new GameToken(GameTokenAddr);

    DRMPk = PrivateKey.random();
    DRMAddr = DRMPk.toPublicKey();
    DRMInstance = new DRM(DRMAddr);
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
    console.timeEnd('Deploying GameToken and DRM');
  });

  test('Alice buys a game', async () => {
    console.time('Alice buys a game');

    const aliceMinaBalanceBefore = Mina.getBalance(alice).toBigInt();
    const aliceGameTokenBalanceBefore = await GameTokenInstance.getBalanceOf(
      alice
    );

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
    const aliceGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(
      alice
    );

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    expect(Number(aliceMinaBalanceBefore - aliceMinaBalanceAfter)).toEqual(
      GAMEPRICE - DISCOUNT + 1e8 + 1e9
    );

    expect(Number(aliceGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(GAMEPRICE - DISCOUNT);
  });

  test('Alice registers a device', async () => {
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
        await DRMInstance.initAndAddDevice(
          alice,
          deviceIdentifier,
          UInt64.from(1)
        );
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
    expect(
      aliceDevices.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();
  });

  test('Alice registers another device', async () => {
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
        await DRMInstance.changeDevice(
          alice,
          deviceIdentifier2,
          UInt64.from(2)
        );
      }
    );

    registerDeviceTx2.sign([alice.key, DRMPk]);

    await registerDeviceTx2.prove();
    await registerDeviceTx2.send();
    console.timeEnd('Alice registers a device');

    console.time('Setttling');

    const proof = await offchainState.createSettlementProof();
    const txnProof2 = await Mina.transaction(alice, async () => {
      await DRMInstance.settle(proof);
    });
    await txnProof2.prove();
    await txnProof2.sign([alice.key]).send();

    console.timeEnd('Setttling');

    const aliceDevices2 = await offchainState.fields.devices.get(alice);
    expect(
      aliceDevices2.value.device_1.equals(AliceDeviceIdentifiers.hash())
    ).toBeTruthy();
    expect(
      aliceDevices2.value.device_2.equals(AliceDeviceIdentifiers2.hash())
    ).toBeTruthy();
  });

  test('Bob trying to register a device without buying a game', async () => {
    try {
      console.time('Device identifier proof create');
      const deviceIdentifier = await DeviceIdentifier.proofForDevice(
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
          await DRMInstance.initAndAddDevice(
            bob,
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk]);

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
      const deviceIdentifier = await DeviceIdentifier.proofForDevice(
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
          await DRMInstance.changeDevice(bob, deviceIdentifier, UInt64.from(1));
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk]);

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

  test('Bob buys a game', async () => {
    console.time('Bob buys a game');

    const bobMinaBalanceBefore = Mina.getBalance(bob).toBigInt();
    const bobGameTokenBalanceBefore = await GameTokenInstance.getBalanceOf(bob);

    const publisherMinaBalanceBefore = Mina.getBalance(publisher).toBigInt();

    const bobTx = await Mina.transaction(
      {
        sender: bob,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(bob);
        await GameTokenInstance.mintGameToken(bob);
      }
    );

    bobTx.sign([bob.key]);

    await bobTx.prove();
    await bobTx.send();
    console.timeEnd('Bob buys a game ...');

    const bobMinaBalanceAfter = Mina.getBalance(bob).toBigInt();
    const bobGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(bob);

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    expect(Number(bobMinaBalanceBefore - bobMinaBalanceAfter)).toEqual(
      GAMEPRICE - DISCOUNT + 1e8 + 1e9
    );

    expect(Number(bobGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(GAMEPRICE - DISCOUNT);
  });

  test('Bob registers a device', async () => {
    console.time('Device identifier proof create');
    const deviceIdentifier = await DeviceIdentifier.proofForDevice(
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
        await DRMInstance.initAndAddDevice(
          bob,
          deviceIdentifier,
          UInt64.from(1)
        );
      }
    );

    registerDeviceTx.sign([bob.key, DRMPk]);

    await registerDeviceTx.prove();
    await registerDeviceTx.send();
    console.timeEnd('Bob registers a device');

    console.time('Settling');

    let proof = await offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(bob, async () => {
      await DRMInstance.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([bob.key]).send();

    console.timeEnd('Settling');

    const bobDevices = await offchainState.fields.devices.get(bob);
    expect(
      bobDevices.value.device_1.equals(BobDeviceIdentifiers.hash())
    ).toBeTruthy();
  });

  test('Bob tries to register a device with other methods', async () => {
    try {
      console.time('Device identifier proof create');
      const deviceIdentifier = await DeviceIdentifier.proofForDevice(
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
          await DRMInstance.changeDevice(bob, deviceIdentifier, UInt64.from(1));
        }
      );

      registerDeviceTx.sign([bob.key, DRMPk]);

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
});
