import {
  PrivateKey,
  Mina,
  UInt64,
  Bool,
  AccountUpdate,
  Field,
  PublicKey,
} from 'o1js';
import { GameToken } from '../GameToken.js';
import { DRM, offchainState } from '../DRM.js';
import { DeviceIdentifier } from '../lib/DeviceIdentifierProof.js';
import { DeviceSession } from '../lib/DeviceSessionProof.js';
import { mockIdentifiers } from './mock.js';
import { Identifiers } from '../lib/DeviceIdentifier.js';
import { BundledDeviceSession } from '../lib/BundledDeviceSessionProof.js';

describe('GameToken Contract Tests', () => {
  const proofsEnabled = true;
  const GAMEPRICE1 = 10000;
  const DISCOUNT1 = 1000;
  const GAMEPRICE2 = 20000;
  const DISCOUNT2 = 2000;
  const TIMEOUTINTERVAL = 100;
  const MAXTREEHEIGHT = 4;

  let deviceIdentifiers: Identifiers[] = [];
  for (const mockIdentifier of mockIdentifiers) {
    deviceIdentifiers.push(Identifiers.fromRaw(mockIdentifier));
  }
  let localChain: any;
  let publisher: any, alice: any, bob: any, charlie: any, david: any;
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
  });

  const consoleActionsForDRM1 = async () => {
    let latest_offchain_commitment =
      await DRMInstance1.offchainStateCommitments.fetch();
    const actionStateRange = {
      fromActionState: latest_offchain_commitment?.actionState,
    };

    let result = await Mina.fetchActions(DRMAddr1, actionStateRange);
    if ('error' in result) throw Error(JSON.stringify(result));
    let actions = result.reduce((accumulator, currentItem) => {
      return (
        accumulator +
        currentItem.actions.reduce((innerAccumulator) => {
          return innerAccumulator + 1;
        }, 0)
      );
    }, 0);

    console.log('actions for DRM1', actions);
  };

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

    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    let txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
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
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    let txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
  });

  test('All players buy game tokens', async () => {
    console.time('All players buy game tokens');
    for (let i = 0; i < 4; i++) {
      const buyTx = await Mina.transaction(
        {
          sender: localChain.testAccounts[i + 1],
          fee: 1e8,
        },
        async () => {
          AccountUpdate.fundNewAccount(localChain.testAccounts[i + 1]);
          await GameTokenInstance1.mintGameToken(
            localChain.testAccounts[i + 1]
          );
        }
      );
      buyTx.sign([localChain.testAccounts[i + 1].key]);
      await buyTx.prove();
      await buyTx.send();
    }
    console.timeEnd('All players buy game tokens');
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();

    expect(await GameTokenInstance1.getBalanceOf(alice)).toEqual(
      UInt64.from(1)
    );
    expect(await GameTokenInstance1.getBalanceOf(bob)).toEqual(UInt64.from(1));
    expect(await GameTokenInstance1.getBalanceOf(charlie)).toEqual(
      UInt64.from(1)
    );
    expect(await GameTokenInstance1.getBalanceOf(david)).toEqual(
      UInt64.from(1)
    );
  });

  test('All players register devices', async () => {
    console.time('All players register devices');
    for (let i = 0; i < 4; i++) {
      const deviceIdentifier = await DeviceIdentifier.proofForDevice(
        deviceIdentifiers[i]
      );
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      expect(deviceSession.isSome.toBoolean()).toBeFalsy();

      const registerTx = await Mina.transaction(
        {
          sender: localChain.testAccounts[i + 1],
          fee: 1e8,
        },
        async () => {
          await DRMInstance1.initAndAddDevice(
            localChain.testAccounts[i + 1],
            deviceIdentifier,
            UInt64.from(1)
          );
        }
      );

      registerTx.sign([localChain.testAccounts[i + 1].key]);
      await registerTx.prove();
      await registerTx.send();
    }
    console.timeEnd('All players register devices');
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const txnProof = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await txnProof.prove();
    await txnProof.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
    for (let i = 0; i < 4; i++) {
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      expect(deviceSession.isSome.toBoolean()).toBeTruthy();
      expect(deviceSession.value.equals(UInt64.from(1))).toBeTruthy();
    }
  });

  test('bundle proof with append 1 device', async () => {
    let deviceProofs = [];
    for (let i = 0; i < 1; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(1),
            newSessionKey: UInt64.from(2),
          },
          deviceIdentifiers[i]
        )
      );
    }

    let bundleProof = await BundledDeviceSession.base(GameTokenAddr1);
    for (let i = 0; i < 1; i++) {
      bundleProof = await BundledDeviceSession.appendToBundle(
        GameTokenAddr1,
        deviceProofs[i],
        bundleProof
      );
    }

    expect(
      bundleProof.publicOutput.deviceCount.equals(Field.from(1))
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].currentSessionKey.equals(
        UInt64.from(1)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].newSessionKey.equals(
        UInt64.from(2)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].hash.equals(
        deviceIdentifiers[0].hash()
      )
    ).toBeTruthy();

    const tx = await Mina.transaction(publisher, async () => {
      await DRMInstance1.submitBudledDeviceSessionProof(bundleProof);
    });

    await tx.prove();
    await tx.sign([publisher.key]).send();
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const settleTx = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await settleTx.prove();
    await settleTx.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();

    for (let i = 0; i < 1; i++) {
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      console.log(`device session for ${i}`, deviceSession.value.toString());
      expect(deviceSession.isSome.toBoolean()).toBeTruthy();
      expect(deviceSession.value.equals(UInt64.from(2))).toBeTruthy();
    }
  });

  test('bundle proof with append 2 devices', async () => {
    let deviceProofs = [];
    for (let i = 0; i < 1; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(2),
            newSessionKey: UInt64.from(3),
          },
          deviceIdentifiers[i]
        )
      );
    }
    for (let i = 1; i < 2; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(1),
            newSessionKey: UInt64.from(3),
          },
          deviceIdentifiers[i]
        )
      );
    }

    let bundleProof = await BundledDeviceSession.base(GameTokenAddr1);
    for (let i = 0; i < 2; i++) {
      bundleProof = await BundledDeviceSession.appendToBundle(
        GameTokenAddr1,
        deviceProofs[i],
        bundleProof
      );
    }

    expect(
      bundleProof.publicOutput.deviceCount.equals(Field.from(2))
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].currentSessionKey.equals(
        UInt64.from(2)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].newSessionKey.equals(
        UInt64.from(3)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].hash.equals(
        deviceIdentifiers[0].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].currentSessionKey.equals(
        UInt64.from(1)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].newSessionKey.equals(
        UInt64.from(3)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].hash.equals(
        deviceIdentifiers[1].hash()
      )
    ).toBeTruthy();

    const tx = await Mina.transaction(publisher, async () => {
      await DRMInstance1.submitBudledDeviceSessionProof(bundleProof);
    });

    await tx.prove();
    await tx.sign([publisher.key]).send();
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const settleTx = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });
    await settleTx.prove();
    await settleTx.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
    for (let i = 0; i < 2; i++) {
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      console.log(`device session for ${i}`, deviceSession.value.toString());
      expect(deviceSession.isSome.toBoolean()).toBeTruthy();
      expect(deviceSession.value.equals(UInt64.from(3))).toBeTruthy();
    }
  });

  test('bundle proof with append 3 devices', async () => {
    let deviceProofs = [];
    for (let i = 0; i < 2; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(3),
            newSessionKey: UInt64.from(4),
          },
          deviceIdentifiers[i]
        )
      );
    }

    for (let i = 2; i < 3; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(1),
            newSessionKey: UInt64.from(4),
          },
          deviceIdentifiers[i]
        )
      );
    }

    let bundleProof = await BundledDeviceSession.base(GameTokenAddr1);
    for (let i = 0; i < 3; i++) {
      bundleProof = await BundledDeviceSession.appendToBundle(
        GameTokenAddr1,
        deviceProofs[i],
        bundleProof
      );
    }

    expect(
      bundleProof.publicOutput.deviceCount.equals(Field.from(3))
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].currentSessionKey.equals(
        UInt64.from(3)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].newSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].hash.equals(
        deviceIdentifiers[0].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].currentSessionKey.equals(
        UInt64.from(3)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].newSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].hash.equals(
        deviceIdentifiers[1].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].currentSessionKey.equals(
        UInt64.from(1)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].newSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].hash.equals(
        deviceIdentifiers[2].hash()
      )
    ).toBeTruthy();

    const tx = await Mina.transaction(publisher, async () => {
      await DRMInstance1.submitBudledDeviceSessionProof(bundleProof);
    });

    await tx.prove();
    await tx.sign([publisher.key]).send();
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const settleTx = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });

    await settleTx.prove();
    await settleTx.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
    for (let i = 0; i < 3; i++) {
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      console.log(`device session for ${i}`, deviceSession.value.toString());
      expect(deviceSession.isSome.toBoolean()).toBeTruthy();
      expect(deviceSession.value.equals(UInt64.from(4))).toBeTruthy();
    }
  });

  test('bundle proof with append 4 devices', async () => {
    let deviceProofs = [];
    for (let i = 0; i < 3; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(4),
            newSessionKey: UInt64.from(5),
          },
          deviceIdentifiers[i]
        )
      );
    }

    for (let i = 3; i < 4; i++) {
      deviceProofs.push(
        await DeviceSession.proofForSession(
          {
            gameToken: GameTokenAddr1,
            currentSessionKey: UInt64.from(1),
            newSessionKey: UInt64.from(5),
          },
          deviceIdentifiers[i]
        )
      );
    }

    let bundleProof = await BundledDeviceSession.base(GameTokenAddr1);
    for (let i = 0; i < 4; i++) {
      bundleProof = await BundledDeviceSession.appendToBundle(
        GameTokenAddr1,
        deviceProofs[i],
        bundleProof
      );
    }

    expect(
      bundleProof.publicOutput.deviceCount.equals(Field.from(4))
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].currentSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].newSessionKey.equals(
        UInt64.from(5)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[0].hash.equals(
        deviceIdentifiers[0].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].currentSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].newSessionKey.equals(
        UInt64.from(5)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[1].hash.equals(
        deviceIdentifiers[1].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].currentSessionKey.equals(
        UInt64.from(4)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].newSessionKey.equals(
        UInt64.from(5)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[2].hash.equals(
        deviceIdentifiers[2].hash()
      )
    ).toBeTruthy();

    expect(
      bundleProof.publicOutput.deviceSessionOutputs[3].currentSessionKey.equals(
        UInt64.from(1)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[3].newSessionKey.equals(
        UInt64.from(5)
      )
    ).toBeTruthy();
    expect(
      bundleProof.publicOutput.deviceSessionOutputs[3].hash.equals(
        deviceIdentifiers[3].hash()
      )
    ).toBeTruthy();

    const tx = await Mina.transaction(publisher, async () => {
      await DRMInstance1.submitBudledDeviceSessionProof(bundleProof);
    });

    await tx.prove();
    await tx.sign([publisher.key]).send();
    await consoleActionsForDRM1();
    console.time('Setttling');

    let proof = await DRMInstance1.offchainState.createSettlementProof();
    const settleTx = await Mina.transaction(alice, async () => {
      await DRMInstance1.settle(proof);
    });

    await settleTx.prove();
    await settleTx.sign([alice.key]).send();

    console.timeEnd('Setttling');
    await consoleActionsForDRM1();
    for (let i = 0; i < 4; i++) {
      const deviceSession =
        await DRMInstance1.offchainState.fields.sessions.get(
          deviceIdentifiers[i].hash()
        );

      console.log(`device session for ${i}`, deviceSession.value.toString());
      expect(deviceSession.isSome.toBoolean()).toBeTruthy();
      expect(deviceSession.value.equals(UInt64.from(5))).toBeTruthy();
    }
  });
});
