import "reflect-metadata";
import { Identifiers } from "drm-mina-contracts/build/src/lib/DeviceIdentifier";
import {
  DeviceIdentifier,
  DeviceIdentifierProof,
} from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof";
import { GameToken } from "drm-mina-contracts/build/src/GameToken";
import { DRM, offchainState } from "drm-mina-contracts/build/src/DRM";
import {
  AccountUpdate,
  Bool,
  fetchAccount,
  Mina,
  PrivateKey,
  PublicKey,
  TokenId,
  UInt64,
} from "o1js";
import { DeviceSession } from "drm-mina-contracts/build/src/lib/DeviceSessionProof";
import { BundledDeviceSession } from "drm-mina-contracts/build/src/lib/BundledDeviceSessionProof";

// type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
  status: "loading" as "loading" | "ready",
  deviceIdentifierProgram: null as typeof DeviceIdentifier | null,
  GameToken: {
    contract: null as null | typeof GameToken,
    instances: {} as { [contractAddress: string]: GameToken },
  },
  DRM: {
    contract: null as null | typeof DRM,
    instances: {} as {
      [contractAddress: string]: DRM;
    },
  },
};
export type State = typeof state;

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network({
      mina: "https://api.minascan.io/node/devnet/v1/graphql",
      archive: "https://api.minascan.io/archive/devnet/v1/graphql",
    });
    console.log("Devnet network instance configured.");
    Mina.setActiveInstance(Network);
  },
  loadAndCompileGameTokenContract: async (args: {}): Promise<void> => {
    if (!state.GameToken.contract) {
      const contract = (
        await import(`drm-mina-contracts/build/src/GameToken.js`)
      )["GameToken"];
      if (!contract) {
        throw new Error(`Could not load contract GameToken from the module`);
      }
      state.GameToken.contract = contract;
    }
    await state.GameToken.contract.compile();
  },
  loadAndCompileDRMContract: async (args: {}): Promise<void> => {
    if (!state.DRM.contract) {
      const contract = (await import(`drm-mina-contracts/build/src/DRM.js`))[
        "DRM"
      ];
      if (!contract) {
        throw new Error(`Could not load contract DRM from the module`);
      }
      state.DRM.contract = contract;
    }
    console.log("Compiling DeviceIdentifier");
    console.time("Compile DeviceIdentifier complete");
    state.deviceIdentifierProgram = DeviceIdentifier;
    await DeviceIdentifier.compile();
    console.timeEnd("Compile DeviceIdentifier complete");
    console.log("Compiling DeviceSession");
    console.time("Compile DeviceSession complete");
    await DeviceSession.compile();
    console.timeEnd("Compile DeviceSession complete");
    console.time("Compile BundleDeviceSession complete");
    await BundledDeviceSession.compile();
    console.timeEnd("Compile BundleDeviceSession complete");
    console.log("Compiling DRM offchain state");
    console.time("Compile offchainState complete");
    await offchainState.compile();
    console.timeEnd("Compile offchainState complete");
    console.log("Compiling DRM contract");
    console.time("Compile DRM complete");
    await state.DRM.contract.compile();
    console.timeEnd("Compile DRM complete");
  },
  getGameTokenInstance: async ({
    contractAddress,
  }: {
    contractAddress: string;
  }): Promise<GameToken> => {
    if (!state.GameToken.contract) {
      throw new Error("GameToken contract is not loaded");
    }
    if (!state.GameToken.instances[contractAddress]) {
      state.GameToken.instances[contractAddress] = new state.GameToken.contract(
        PublicKey.fromBase58(contractAddress)
      );
    }
    return state.GameToken.instances[contractAddress];
  },
  getDRMInstance: async ({ contractAddress }: { contractAddress: string }) => {
    if (!state.DRM.contract) {
      throw new Error("DRM contract is not loaded");
    }
    if (!state.DRM.instances[contractAddress]) {
      state.DRM.instances[contractAddress] = new state.DRM.contract(
        PublicKey.fromBase58(contractAddress)
      );
      state.DRM.instances[contractAddress].offchainState.setContractInstance(
        state.DRM.instances[contractAddress]
      );
    }
    return state.DRM.instances[contractAddress];
  },
  fetchAccount: async (args: { publicKey: string; tokenId?: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey);
    return await fetchAccount({
      publicKey,
      tokenId: args.tokenId ? TokenId.fromBase58(args.tokenId) : undefined,
    });
  },
  getMinaBalance: async ({
    userAddress,
  }: {
    userAddress: string;
  }): Promise<string> => {
    try {
      const publicKey = PublicKey.fromBase58(userAddress);
      await fetchAccount({
        publicKey,
      });
      const balance = Mina.getBalance(publicKey);
      return balance.toString();
    } catch (e) {
      return "0";
    }
  },
  getTokenOwnership: async ({
    userAddress,
    contractPublicKey,
  }: {
    userAddress: string;
    contractPublicKey: string;
  }): Promise<string> => {
    try {
      const publicKey = PublicKey.fromBase58(userAddress);
      const tokenId = TokenId.derive(PublicKey.fromBase58(contractPublicKey));
      await fetchAccount({
        publicKey,
        tokenId,
      });
      const balance = Mina.getBalance(publicKey, tokenId);
      return balance.toString();
    } catch (e) {
      return "0";
    }
  },
  getPrice: async ({
    contractPublicKey,
  }: {
    contractPublicKey: string;
  }): Promise<string> => {
    const contractInstance = await functions.getGameTokenInstance({
      contractAddress: contractPublicKey,
    });
    const currentPrice = await contractInstance.gamePrice.fetch();
    const currentDiscount = await contractInstance.discount.fetch();
    return JSON.stringify({
      price: currentPrice?.toString(),
      discount: currentDiscount?.toString(),
    });
  },
  buyGame: async ({
    recipient,
    contractPublicKey,
  }: {
    recipient: string;
    contractPublicKey: string;
  }): Promise<string> => {
    const contractInstance = await functions.getGameTokenInstance({
      contractAddress: contractPublicKey,
    });
    const sender = PublicKey.fromBase58(recipient);
    const transaction = await Mina.transaction(
      {
        sender: sender,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(sender);
        await contractInstance.mintGameToken(sender);
      }
    );
    await transaction.prove();
    return transaction.toJSON();
  },
  // compileProgram: async (args: {}): Promise<void> => {
  //     state.deviceIdentifierProgram = DeviceIdentifier;
  //     await DeviceIdentifier.compile();
  // },
  initAndAddDevice: async ({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) => {
    try {
      console.log(
        "Init and add device",
        userAddress,
        rawIdentifiers,
        deviceIndex
      );
      if (!state.deviceIdentifierProgram) {
        throw new Error("Program not compiled");
      }

      const contractInstance = await functions.getDRMInstance({
        contractAddress: contractPublicKey,
      });

      const gameTokenAddress = await contractInstance.gameTokenAddress.fetch();

      if (!gameTokenAddress) {
        throw new Error("GameToken address not found");
      }

      const identifiers = Identifiers.fromRaw(rawIdentifiers);
      const proof: DeviceIdentifierProof =
        await state.deviceIdentifierProgram.proofForDevice(identifiers);

      const sender = PublicKey.fromBase58(userAddress);
      const transaction = await Mina.transaction(
        {
          sender: sender,
          fee: 1e8,
        },
        async () => {
          await contractInstance.initAndAddDevice(
            sender,
            proof,
            UInt64.from(deviceIndex)
          );
        }
      );

      await transaction.prove();
      return transaction.toJSON();
    } catch (e) {
      console.error(e);
    }
  },
  changeDevice: async ({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) => {
    try {
      console.log(
        "Changing device",
        userAddress,
        rawIdentifiers,
        deviceIndex,
        contractPublicKey
      );
      if (!state.deviceIdentifierProgram) {
        throw new Error("Program not compiled");
      }

      const contractInstance = await functions.getDRMInstance({
        contractAddress: contractPublicKey,
      });

      const gameTokenAddress = await contractInstance.gameTokenAddress.fetch();

      if (!gameTokenAddress) {
        throw new Error("GameToken address not found");
      }

      const identifiers = Identifiers.fromRaw(rawIdentifiers);
      const proof: DeviceIdentifierProof =
        await state.deviceIdentifierProgram.proofForDevice(identifiers);

      const sender = PublicKey.fromBase58(userAddress);
      const transaction = await Mina.transaction(
        {
          sender: sender,
          fee: 1e8,
        },
        async () => {
          await contractInstance.changeDevice(
            sender,
            proof,
            UInt64.from(deviceIndex)
          );
        }
      );

      await transaction.prove();
      return transaction.toJSON();
    } catch (e) {
      console.error(e);
    }
  },
  settle: async ({
    contractAddress,
    userAddress,
  }: {
    contractAddress: string;
    userAddress: string;
  }) => {
    const contractInstance = await functions.getDRMInstance({
      contractAddress,
    });

    await fetchAccount({
      publicKey: PublicKey.fromBase58(userAddress),
    });

    await fetchAccount({
      publicKey: PublicKey.fromBase58(contractAddress),
    });

    let proof = await contractInstance.offchainState.createSettlementProof();

    const transaction = await Mina.transaction(
      {
        sender: PublicKey.fromBase58(userAddress),
        fee: 1e9,
      },
      async () => {
        await contractInstance.settle(proof);
      }
    );

    await transaction.prove();
    return transaction.toJSON();
  },
  getMaxDeviceAllowed: async ({
    contractAddress,
  }: {
    contractAddress: string;
  }) => {
    const gameTokenInstance = await functions.getGameTokenInstance({
      contractAddress,
    });
    const maxDeviceAllowed = await gameTokenInstance.maxDeviceAllowed.fetch();
    return maxDeviceAllowed ? maxDeviceAllowed.toString() : "0";
  },
  getDevices: async ({
    userAddress,
    contractAddress,
  }: {
    userAddress: string;
    contractAddress: string;
  }) => {
    console.log("Getting devices for", userAddress, contractAddress);
    console.time("Get DRM Instance");
    const contractInstance = await functions.getDRMInstance({
      contractAddress: contractAddress,
    });
    console.timeEnd("Get DRM Instance");

    await fetchAccount({
      publicKey: PublicKey.fromBase58(userAddress),
    });

    await fetchAccount({
      publicKey: PublicKey.fromBase58(contractAddress),
    });

    await Mina.fetchActions(PublicKey.fromBase58(contractAddress));

    console.log("Getting devices");
    const devices = await contractInstance.offchainState.fields.devices.get(
      PublicKey.fromBase58(userAddress)
    );

    console.log("Devices", devices);

    console.log("issome", devices.isSome.toBoolean());

    console.log([
      devices.value.device_1.toString(),
      devices.value.device_2.toString(),
      devices.value.device_3.toString(),
      devices.value.device_4.toString(),
    ]);

    return [
      devices.value.device_1.toString(),
      devices.value.device_2.toString(),
      devices.value.device_3.toString(),
      devices.value.device_4.toString(),
    ];
  },
  assignDeviceToSlot: async ({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) => {
    console.log("Getting devices for", userAddress, contractPublicKey);
    console.time("Get DRM Instance");
    const contractInstance = await functions.getDRMInstance({
      contractAddress: contractPublicKey,
    });
    console.timeEnd("Get DRM Instance");

    await fetchAccount({
      publicKey: PublicKey.fromBase58(userAddress),
    });

    await fetchAccount({
      publicKey: PublicKey.fromBase58(contractPublicKey),
    });

    console.log("Getting devices to assign");
    const devices = await contractInstance.offchainState.fields.devices.get(
      PublicKey.fromBase58(userAddress)
    );

    console.log("Devices", devices);

    console.log("issome", devices.isSome.toBoolean());

    if (!devices.isSome.toBoolean()) {
      return await functions.initAndAddDevice({
        userAddress,
        rawIdentifiers,
        deviceIndex,
        contractPublicKey,
      });
    } else {
      return await functions.changeDevice({
        userAddress,
        rawIdentifiers,
        deviceIndex,
        contractPublicKey,
      });
    }
  },

  deployGameToken: async ({
    publisher,
    symbol,
    price,
    discount,
    timeoutInterval,
    numberOfDevices,
  }: {
    publisher: string;
    symbol: string;
    price: number;
    discount: number;
    timeoutInterval: number;
    numberOfDevices: number;
  }) => {
    const publisherPubKey = PublicKey.fromBase58(publisher);

    const GameTokenPk = PrivateKey.random();
    const GameTokenAddr = GameTokenPk.toPublicKey();
    const GameTokenInstance = new GameToken(GameTokenAddr);

    const DRMPk = PrivateKey.random();
    const DRMAddr = DRMPk.toPublicKey();
    const DRMInstance = new DRM(DRMAddr);
    DRMInstance.offchainState.setContractInstance(DRMInstance);

    const transaction = await Mina.transaction(
      {
        sender: publisherPubKey,
        fee: 1e8,
      },
      async () => {
        AccountUpdate.fundNewAccount(publisherPubKey, 3);
        await GameTokenInstance.deploy({
          symbol,
          src: "https://github.com/DRM-Mina/drm-mina-web-client/blob/main/contracts/src/GameToken.ts",
        });
        await GameTokenInstance.initialize(
          publisherPubKey,
          UInt64.from(price),
          UInt64.from(discount),
          UInt64.from(timeoutInterval),
          UInt64.from(numberOfDevices),
          Bool(false)
        );
        await DRMInstance.deploy();
        await DRMInstance.initialize(GameTokenAddr);
      }
    );

    await transaction.prove();
    transaction.sign([GameTokenPk, DRMPk]);
    return JSON.stringify({
      GameTokenAddr: GameTokenAddr.toBase58(),
      GameTokenPk: GameTokenPk.toBase58(),
      DRMAddr: DRMAddr.toBase58(),
      DRMPk: DRMPk.toBase58(),
      transaction: transaction.toJSON(),
    });
  },
};
export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log("Web Worker Successfully Initialized.");
