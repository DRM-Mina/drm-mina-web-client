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
import { GameToken } from '../GameToken.js';

const proofsEnabled = false;
const GAMEPRICE = 10000;
const DISCOUNT = 1000;
const TIMEOUTINTERVAL = 100;
const MAXTREEHEIGHT = 2;

const localChain = await Mina.LocalBlockchain({
  proofsEnabled,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(localChain);

console.log('Compiling GameToken ...');
await GameToken.compile();

const [publisher, alice, bob, charlie, david] = localChain.testAccounts;

const GameTokenPk = PrivateKey.random();
const GameTokenAddr = GameTokenPk.toPublicKey();

const GameTokenInstance = new GameToken(GameTokenAddr);

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
} catch (e) {
  console.log('Second initialization failed as expected');
}

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
