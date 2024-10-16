import { AccountUpdate, Bool, Mina, PrivateKey, UInt64 } from 'o1js';
import { GameToken } from '../GameToken.js';
import dotenv from 'dotenv';

dotenv.config();

const Network = Mina.Network('https://api.minascan.io/node/devnet/v1/graphql');
Mina.setActiveInstance(Network);

const GAMEPRICE = [10_000_000_000, 20_000_000_000, 15_000_000_000];
const DISCOUNT = [2_000_000_000, 10_000_000_000, 5_000_000_000];
const TIMEOUTINTERVAL = 10000;
const MAXDEVICEALLOWED = 4;

// @ts-ignore
const publisherPrivateKey = PrivateKey.fromBase58(process.env.PUBLISHER_KEY);
const publisher = publisherPrivateKey.toPublicKey();

const GameTokenPk = PrivateKey.random();
const GameTokenAddr = GameTokenPk.toPublicKey();

console.log('Compiling GameToken ...');
await GameToken.compile();

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
      UInt64.from(GAMEPRICE[0]),
      UInt64.from(DISCOUNT[0]),
      UInt64.from(TIMEOUTINTERVAL),
      UInt64.from(MAXDEVICEALLOWED),
      Bool(false)
    );
  }
);

deployTx.sign([publisherPrivateKey, GameTokenPk]);

await deployTx.prove();
let pendingTransaction = await deployTx.send();

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

console.log('Contract deployed at', GameTokenAddr.toBase58());
