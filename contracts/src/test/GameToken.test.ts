import { PrivateKey, Mina, UInt64, Bool, AccountUpdate } from 'o1js';
import { GameToken } from '../GameToken.js';

describe('GameToken Contract Tests', () => {
  const proofsEnabled = true;
  const GAMEPRICE = 10000;
  const DISCOUNT = 1000;
  const TIMEOUTINTERVAL = 100;
  const MAXTREEHEIGHT = 2;

  let localChain: any;
  let publisher: any, alice: any, bob: any, charlie: any, david: any;
  let GameTokenPk: PrivateKey;
  let GameTokenAddr: any;
  let GameTokenInstance: GameToken;

  beforeAll(async () => {
    localChain = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits: false,
    });
    Mina.setActiveInstance(localChain);

    console.log('Compiling GameToken ...');
    await GameToken.compile();

    [publisher, alice, bob, charlie, david] = localChain.testAccounts;

    GameTokenPk = PrivateKey.random();
    GameTokenAddr = GameTokenPk.toPublicKey();
    GameTokenInstance = new GameToken(GameTokenAddr);
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
          UInt64.from(MAXTREEHEIGHT),
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
            UInt64.from(MAXTREEHEIGHT),
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
});
