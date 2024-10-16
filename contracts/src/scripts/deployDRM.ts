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
  fetchAccount,
} from 'o1js';
import { DRM, offchainState } from '../DRM.js';
import { GameToken } from '../GameToken.js';
import { DeviceIdentifier, Identifiers } from '../lib/index.js';
import { DeviceSession } from '../lib/DeviceSessionProof.js';
import dotenv from 'dotenv';

dotenv.config();

const Network = Mina.Network({
  mina: 'https://api.minascan.io/node/devnet/v1/graphql',
  archive: 'https://api.minascan.io/archive/devnet/v1/graphql',
});
Mina.setActiveInstance(Network);

// @ts-ignore
const publisherPrivateKey = PrivateKey.fromBase58(process.env.PUBLISHER_KEY);
const publisherPubKey = publisherPrivateKey.toPublicKey();
console.log(publisherPubKey.toBase58());
// await fetchAccount({
//   publicKey: publisherPubKey,
// });

const GAMEPRICE = [10_000_000_000, 20_000_000_000, 15_000_000_000];
const DISCOUNT = [2_000_000_000, 10_000_000_000, 5_000_000_000];
const TIMEOUTINTERVAL = 10000;
const MAXDEVICEALLOWED = 4;

const drmInstances = new Map();

async function getDRMInstance(contractAddress: string) {
  if (drmInstances.has(contractAddress)) {
    return drmInstances.get(contractAddress);
  }

  const instance = new DRM(PublicKey.fromBase58(contractAddress));

  const offchainStateInstance = Object.create(offchainState);
  offchainStateInstance.setContractInstance(instance);

  console.time('Compile OffchainState');
  await offchainStateInstance.compile();
  console.timeEnd('Compile OffchainState');
  console.time('Compile DRM');
  await DRM.compile();
  console.timeEnd('Compile DRM');

  drmInstances.set(contractAddress, {
    instance,
    offchainState: offchainStateInstance,
  });

  return { instance, offchainState: offchainStateInstance };
}

console.time('Compile DeviceIdentifier ');
await DeviceIdentifier.compile();
console.timeEnd('Compile DeviceIdentifier ');
console.time('Compile DeviceSession ');
await DeviceSession.compile();
console.timeEnd('Compile DeviceSession ');
console.time('Compile GameToken ');
await GameToken.compile();
console.timeEnd('Compile GameToken ');

for (let i = 0; i < 3; i++) {
  const GameTokenPk = PrivateKey.random();
  const GameTokenAddr = GameTokenPk.toPublicKey();
  const GameTokenInstance = new GameToken(GameTokenAddr);

  const DRMPk = PrivateKey.random();
  const DRMAddr = DRMPk.toPublicKey();
  const { instance: DRMInstance } = await getDRMInstance(DRMAddr.toBase58());
  console.time(`Deploying ${i}`);
  const deployTx = await Mina.transaction(
    {
      sender: publisherPubKey,
      fee: 1e8,
    },
    async () => {
      AccountUpdate.fundNewAccount(publisherPubKey, 3);
      await GameTokenInstance.deploy({
        symbol: 'DRM',
        src: '',
      });
      await GameTokenInstance.initialize(
        publisherPubKey,
        UInt64.from(GAMEPRICE[i]),
        UInt64.from(DISCOUNT[i]),
        UInt64.from(TIMEOUTINTERVAL),
        UInt64.from(MAXDEVICEALLOWED),
        Bool(false)
      );
      await DRMInstance.deploy();
      await DRMInstance.initialize(GameTokenAddr);
    }
  );
  deployTx.sign([publisherPrivateKey, GameTokenPk, DRMPk]);

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
  console.timeEnd(`Deploying ${i}`);
  console.log(`GameToken deployed at ${GameTokenAddr.toBase58()}`);
  console.log(`DRM deployed at ${DRMAddr.toBase58()}`);
}
