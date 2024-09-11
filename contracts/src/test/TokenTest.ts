import {
  AccountUpdate,
  AccountUpdateForest,
  Bool,
  DeployArgs,
  Int64,
  method,
  Mina,
  Permissions,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
  UInt8,
} from 'o1js';
import {
  CustomTokenAdmin,
  FungibleToken,
  FungibleTokenAdmin,
} from '../other/index.js';

const localChain = await Mina.LocalBlockchain({
  proofsEnabled: false,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(localChain);

await FungibleToken.compile();
// await FungibleTokenAdmin.compile();
await CustomTokenAdmin.compile();
// await ThirdParty.compile();

const [
  //   tokenAdmin,
  //   newTokenAdmin,
  //   tokenA,
  tokenBAdmin,
  tokenB,
  //   thirdPartyA,
  //   thirdPartyB,
] = Mina.TestPublicKey.random(7);
const [deployer, sender, receiver] = localChain.testAccounts;
// const tokenAdminContract = new FungibleTokenAdmin(tokenAdmin);
// const newTokenAdminContract = new FungibleTokenAdmin(newTokenAdmin);
// const tokenAContract = new FungibleToken(tokenA);
const tokenBAdminContract = new CustomTokenAdmin(tokenBAdmin);
const tokenBContract = new FungibleToken(tokenB);
// const thirdPartyAContract = new ThirdParty(thirdPartyA);
// const thirdPartyBContract = new ThirdParty(thirdPartyB);

/*
console.log('Deploying Token A ...');
let tx = await Mina.transaction(
  {
    sender: deployer,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(deployer, 3);
    await tokenAdminContract.deploy({
      adminPublicKey: tokenAdmin,
    });
    await tokenAContract.deploy({
      symbol: 'tokA',
      src: 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts',
    });
    await tokenAContract.initialize(tokenAdmin, UInt8.from(9), Bool(true));
  }
);

tx.sign([deployer.key, tokenA.key, tokenAdmin.key]);

await tx.prove();
await tx.send();

console.log('Third party contracts deploying ...');

tx = await Mina.transaction(
  {
    sender: deployer,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(deployer, 2);
    await thirdPartyAContract.deploy({ ownerAddress: tokenA });
    await thirdPartyBContract.deploy({ ownerAddress: tokenA });
  }
);

tx.sign([deployer.key, thirdPartyA.key, thirdPartyB.key]);

await tx.prove();
await tx.send();

console.log('Call Resume on Token A ...');

tx = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    await tokenAContract.resume();
  }
);
tx.sign([sender.key, tokenAdmin.key]);
await tx.prove();
await tx.send();

console.log('Minting and burning tokens from Token A ...');

const mintAmount = UInt64.from(1000);
const burnAmount = UInt64.from(100);

let initialBalance = (await tokenAContract.getBalanceOf(sender)).toBigInt();
let initialCirculating = (await tokenAContract.getCirculating()).toBigInt();

tx = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(sender, 1);
    await tokenAContract.mint(sender, mintAmount);
  }
);

tx.sign([sender.key, tokenAdmin.key]);
await tx.prove();
await tx.send();

const tx2 = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(sender, 1);
    await tokenAContract.mint(receiver, mintAmount);
  }
);

tx2.sign([sender.key, tokenAdmin.key]);
await tx2.prove();
await tx2.send();

const currentBalance = await tokenAContract.getBalanceOf(sender);

const circulatingSupply = await tokenAContract.getCirculating();

console.log('Initial balance:', initialBalance);
console.log('Current balance:', currentBalance.toString());

console.log('Initial circulating supply:', initialCirculating);
console.log('Current circulating supply:', circulatingSupply.toString());

initialBalance = (await tokenAContract.getBalanceOf(sender)).toBigInt();
initialCirculating = (await tokenAContract.getCirculating()).toBigInt();

tx = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    await tokenAContract.burn(sender, burnAmount);
  }
);

tx.sign([sender.key]);
await tx.prove();
await tx.send();

const currentBalance2 = await tokenAContract.getBalanceOf(sender);

const circulatingSupply2 = await tokenAContract.getCirculating();

console.log('Initial balance:', initialBalance);
console.log('Current balance:', currentBalance2.toString());

console.log('Initial circulating supply:', initialCirculating);
console.log('Current circulating supply:', circulatingSupply2.toString());
*/

console.log('Deploying Custom Token...');

let tx = await Mina.transaction(
  {
    sender: deployer,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(deployer, 3);
    await tokenBAdminContract.deploy({
      adminPublicKey: tokenBAdmin,
    });
    await tokenBContract.deploy({
      symbol: 'custom',
      src: 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts',
    });
    await tokenBContract.initialize(tokenBAdmin, UInt8.from(9), Bool(true));
  }
);

tx.sign([deployer.key, tokenB.key, tokenBAdmin.key]);

await tx.prove();
await tx.send();

console.log('Call Resume on Custom Token ...');

tx = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    await tokenBContract.resume();
  }
);
tx.sign([sender.key, tokenBAdmin.key]);
await tx.prove();
await tx.send();

console.log('Minting tokens from Custom Token ...');

const mintAmount2 = UInt64.from(1);

let initialBalance = (await tokenBContract.getBalanceOf(sender)).toBigInt();
let initialCirculating = (await tokenBContract.getCirculating()).toBigInt();

tx = await Mina.transaction(
  {
    sender: sender,
    fee: 1e8,
  },
  async () => {
    AccountUpdate.fundNewAccount(sender, 1);
    await tokenBContract.mint(sender, mintAmount2);
  }
);

tx.sign([
  sender.key,
  // , tokenBAdmin.key
]);

await tx.prove();
await tx.send();

const currentBalance3 = await tokenBContract.getBalanceOf(sender);

const circulatingSupply3 = await tokenBContract.getCirculating();

console.log('Initial balance:', initialBalance);
console.log('Current balance:', currentBalance3.toString());

console.log('Initial circulating supply:', initialCirculating);
console.log('Current circulating supply:', circulatingSupply3.toString());
