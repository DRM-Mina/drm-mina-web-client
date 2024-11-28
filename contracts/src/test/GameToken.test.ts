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
import { DummyContract } from './Dummy.js';

describe('GameToken Contract Tests', () => {
  const proofsEnabled = false;
  let GAMEPRICE = 10000;
  let DISCOUNT = 1000;
  let TIMEOUTINTERVAL = 100;
  let MAXDEVICESALLOWED = 2;

  let localChain: any;
  let publisher: any,
    newPublisher: any,
    alice: any,
    bob: any,
    charlie: any,
    david: any;
  let GameTokenPk: PrivateKey;
  let GameTokenAddr: any;
  let GameTokenInstance: GameToken;

  let dummyVK: VerificationKey;

  beforeAll(async () => {
    localChain = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits: false,
    });
    Mina.setActiveInstance(localChain);

    console.log('Compiling GameToken ...');
    await GameToken.compile();

    console.log('Compiling DummyContract ...');
    dummyVK = (await DummyContract.compile()).verificationKey;

    [publisher, newPublisher, alice, bob, charlie, david] =
      localChain.testAccounts;

    GameTokenPk = PrivateKey.random();
    GameTokenAddr = GameTokenPk.toPublicKey();
    GameTokenInstance = new GameToken(GameTokenAddr);
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

  test('Deploying GameToken', async () => {
    console.log('Deploying GameToken ...');
    const deployTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(publisher, 2);
        await GameTokenInstance.deploy({
          symbol: 'tokA',
          src: '',
        });
        await GameTokenInstance.initialize(
          publisher,
          UInt64.from(GAMEPRICE),
          UInt64.from(DISCOUNT),
          UInt64.from(TIMEOUTINTERVAL),
          UInt64.from(MAXDEVICESALLOWED),
          Bool(false)
        );
      }
    );

    deployTx.sign([publisher.key, GameTokenPk]);

    await deployTx.prove();
    await deployTx.send();

    console.log('GameToken deployed successfully');
  });

  test('Second initialization should fail', async () => {
    console.log('Second initialization ...');

    try {
      const secondInit = await Mina.transaction(
        {
          sender: publisher,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.initialize(
            publisher,
            UInt64.from(GAMEPRICE),
            UInt64.from(DISCOUNT),
            UInt64.from(TIMEOUTINTERVAL),
            UInt64.from(MAXDEVICESALLOWED),
            Bool(false)
          );
        }
      );

      secondInit.sign([publisher.key, GameTokenPk]);

      await secondInit.prove();
      await secondInit.send();
      throw new Error('Second initialization should have failed');
    } catch (e) {
      console.log('Second initialization failed as expected');
    }
  });

  test('Alice buys a game', async () => {
    console.log('Alice buys a game ...');

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
        await GameTokenInstance.mintGameToken(alice);
      }
    );

    aliceTx.sign([alice.key]);

    await aliceTx.prove();
    await aliceTx.send();

    const aliceMinaBalanceAfter = Mina.getBalance(alice).toBigInt();
    const aliceGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(
      alice
    );

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceAfter = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    expect(Number(aliceMinaBalanceBefore - aliceMinaBalanceAfter)).toEqual(
      GAMEPRICE - DISCOUNT + 1e8 + 1e9
    );

    expect(Number(aliceGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(drmProviderMinaBalanceAfter - drmProviderMinaBalanceBefore)
    ).toEqual(
      Math.ceil(((GAMEPRICE - DISCOUNT) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(
      GAMEPRICE -
        DISCOUNT -
        Math.ceil(((GAMEPRICE - DISCOUNT) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );
  });

  test('Bob buys a game', async () => {
    console.log('Bob buys a game ...');

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
        await GameTokenInstance.mintGameToken(bob);
      }
    );

    bobTx.sign([bob.key]);

    await bobTx.prove();
    await bobTx.send();

    const bobMinaBalanceAfter = Mina.getBalance(bob).toBigInt();
    const bobGameTokenBalanceAfter = await GameTokenInstance.getBalanceOf(bob);

    const publisherMinaBalanceAfter = Mina.getBalance(publisher).toBigInt();

    const drmProviderMinaBalanceAfter = Mina.getBalance(
      DRM_MINA_PROVIDER_PUB_KEY
    ).toBigInt();

    expect(Number(bobMinaBalanceBefore - bobMinaBalanceAfter)).toEqual(
      GAMEPRICE - DISCOUNT + 1e8 + 1e9
    );

    expect(Number(bobGameTokenBalanceAfter.toString())).toEqual(1);

    expect(
      Number(drmProviderMinaBalanceAfter - drmProviderMinaBalanceBefore)
    ).toEqual(
      Math.ceil(((GAMEPRICE - DISCOUNT) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );

    expect(
      Number(publisherMinaBalanceAfter - publisherMinaBalanceBefore)
    ).toEqual(
      GAMEPRICE -
        DISCOUNT -
        Math.ceil(((GAMEPRICE - DISCOUNT) * DRM_MINA_FEE_PERCENTAGE) / 100)
    );
  });

  test('Publisher changes the price', async () => {
    console.log('Publisher changes the price ...');

    const changePriceTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setGamePrice(UInt64.from(20000));
      }
    );

    changePriceTx.sign([publisher.key]);

    await changePriceTx.prove();
    await changePriceTx.send();

    GAMEPRICE = 20000;

    expect(Number(await GameTokenInstance.gamePrice.fetch())).toEqual(
      GAMEPRICE
    );
  });

  test('Publisher changes the discount', async () => {
    console.log('Publisher changes the discount ...');

    const changeDiscountTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setDiscount(UInt64.from(2000));
      }
    );

    changeDiscountTx.sign([publisher.key]);

    await changeDiscountTx.prove();
    await changeDiscountTx.send();

    DISCOUNT = 2000;

    expect(Number(await GameTokenInstance.discount.fetch())).toEqual(DISCOUNT);
  });

  test('Publisher changes the timeout interval', async () => {
    console.log('Publisher changes the timeout interval ...');

    const changeTimeoutIntervalTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setTimeoutInterval(UInt64.from(200));
      }
    );

    changeTimeoutIntervalTx.sign([publisher.key]);

    await changeTimeoutIntervalTx.prove();
    await changeTimeoutIntervalTx.send();

    TIMEOUTINTERVAL = 200;

    expect(Number(await GameTokenInstance.timeoutInterval.fetch())).toEqual(
      TIMEOUTINTERVAL
    );
  });

  test('Publisher changes the max devices allowed', async () => {
    console.log('Publisher changes the max devices allowed ...');

    const changeMaxDevicesAllowedTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setMaxDeviceAllowed(UInt64.from(3));
      }
    );

    changeMaxDevicesAllowedTx.sign([publisher.key]);

    await changeMaxDevicesAllowedTx.prove();
    await changeMaxDevicesAllowedTx.send();

    MAXDEVICESALLOWED = 3;

    expect(Number(await GameTokenInstance.maxDeviceAllowed.fetch())).toEqual(
      MAXDEVICESALLOWED
    );
  });

  test('Publisher changes states in bulk', async () => {
    console.log('Publisher changes states in bulk ...');

    const bulkTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setBulk(
          publisher,
          UInt64.from(30000),
          UInt64.from(3000),
          UInt64.from(300),
          UInt64.from(4)
        );
      }
    );

    bulkTx.sign([publisher.key]);

    await bulkTx.prove();
    await bulkTx.send();

    GAMEPRICE = 30000;
    DISCOUNT = 3000;
    TIMEOUTINTERVAL = 300;
    MAXDEVICESALLOWED = 4;

    expect(Number(await GameTokenInstance.gamePrice.fetch())).toEqual(
      GAMEPRICE
    );
    expect(Number(await GameTokenInstance.discount.fetch())).toEqual(DISCOUNT);
    expect(Number(await GameTokenInstance.timeoutInterval.fetch())).toEqual(
      TIMEOUTINTERVAL
    );
    expect(Number(await GameTokenInstance.maxDeviceAllowed.fetch())).toEqual(
      MAXDEVICESALLOWED
    );
  });

  test('Charlie tries to change the price', async () => {
    console.log('Charlie tries to change the price ...');

    try {
      const changePriceTx = await Mina.transaction(
        {
          sender: charlie,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setGamePrice(UInt64.from(40000));
        }
      );

      changePriceTx.sign([charlie.key]);

      await changePriceTx.prove();
      await changePriceTx.send();
      throw new Error('Charlie should not be able to change the price');
    } catch (e) {
      console.log('Charlie cannot change the price as expected');
    }
  });

  test('David tries to change the discount', async () => {
    console.log('David tries to change the discount ...');

    try {
      const changeDiscountTx = await Mina.transaction(
        {
          sender: david,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setDiscount(UInt64.from(4000));
        }
      );

      changeDiscountTx.sign([david.key]);

      await changeDiscountTx.prove();
      await changeDiscountTx.send();
      throw new Error('David should not be able to change the discount');
    } catch (e) {
      console.log('David cannot change the discount as expected');
    }
  });

  test('Alice tries to change the timeout interval', async () => {
    console.log('Alice tries to change the timeout interval ...');

    try {
      const changeTimeoutIntervalTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setTimeoutInterval(UInt64.from(400));
        }
      );

      changeTimeoutIntervalTx.sign([alice.key]);

      await changeTimeoutIntervalTx.prove();
      await changeTimeoutIntervalTx.send();
      throw new Error(
        'Alice should not be able to change the timeout interval'
      );
    } catch (e) {
      console.log('Alice cannot change the timeout interval as expected');
    }
  });

  test('Bob tries to change the max devices allowed', async () => {
    console.log('Bob tries to change the max devices allowed ...');

    try {
      const changeMaxDevicesAllowedTx = await Mina.transaction(
        {
          sender: bob,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setMaxDeviceAllowed(UInt64.from(5));
        }
      );

      changeMaxDevicesAllowedTx.sign([bob.key]);

      await changeMaxDevicesAllowedTx.prove();
      await changeMaxDevicesAllowedTx.send();
      throw new Error(
        'Bob should not be able to change the max devices allowed'
      );
    } catch (e) {
      console.log('Bob cannot change the max devices allowed as expected');
    }
  });

  test('Alice tries to change states in bulk', async () => {
    console.log('Alice tries to change states in bulk ...');

    try {
      const bulkTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setBulk(
            alice,
            UInt64.from(40000),
            UInt64.from(4000),
            UInt64.from(400),
            UInt64.from(5)
          );
        }
      );

      bulkTx.sign([alice.key]);

      await bulkTx.prove();
      await bulkTx.send();
      throw new Error('Alice should not be able to change states in bulk');
    } catch (e) {
      console.log('Alice cannot change states in bulk as expected');
    }
  });

  test('Publisher changes the publisher', async () => {
    const changePublisherTx = await Mina.transaction(
      {
        sender: publisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.setPublisher(newPublisher);
      }
    );

    changePublisherTx.sign([publisher.key]);

    await changePublisherTx.prove();
    await changePublisherTx.send();

    expect((await GameTokenInstance.publisher.fetch())?.toBase58()).toEqual(
      newPublisher.toBase58()
    );
  });

  test('Publisher changes the publisher back', async () => {
    console.log('Publisher changes the publisher back ...');

    try {
      const changePublisherTx = await Mina.transaction(
        {
          sender: publisher,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.setPublisher(publisher);
        }
      );

      changePublisherTx.sign([publisher.key]);

      await changePublisherTx.prove();
      await changePublisherTx.send();
      throw new Error(
        'Publisher should not be able to change the publisher back'
      );
    } catch (e) {
      console.log('Publisher cannot change the publisher back as expected');
    }
  });

  test('Alice tries to change the verification key', async () => {
    try {
      const changeVKTx = await Mina.transaction(
        {
          sender: alice,
          fee: 1e8,
        },
        async () => {
          await GameTokenInstance.updateVerificationKey(dummyVK);
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

  test('Publisher changes the verification key', async () => {
    console.log('Publisher changes the verification key ...');

    const changeVKTx = await Mina.transaction(
      {
        sender: newPublisher,
        fee: 1e8,
      },
      async () => {
        await GameTokenInstance.updateVerificationKey(dummyVK);
      }
    );

    changeVKTx.sign([newPublisher.key]);

    await changeVKTx.prove();
    await changeVKTx.send();

    let account = Mina.getAccount(GameTokenAddr);

    expect(account?.zkapp?.verificationKey?.hash.toBigInt()).toEqual(
      dummyVK.hash.toBigInt()
    );
  });
});
