import "reflect-metadata";
import { Identifiers } from "drm-mina-contracts/build/src/lib/DeviceIdentifier";
import {
    DeviceIdentifier,
    DeviceIdentifierProof,
} from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof";
import { GameToken } from "drm-mina-contracts/build/src/GameToken";
import { DRM } from "drm-mina-contracts/build/src/DRM";
import { AccountUpdate, fetchAccount, Mina, PublicKey, UInt64 } from "o1js";

// type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
    status: "loading" as "loading" | "ready",
    deviceIdentifierProgram: null as typeof DeviceIdentifier | null,
    contracts: {
        GameToken: null as null | typeof GameToken,
        DRM: null as null | typeof DRM,
    },
    // transaction: null as null | Transaction,
};
export type State = typeof state;

export type ContractName = keyof State["contracts"];

const functions = {
    setActiveInstanceToDevnet: async (args: {}) => {
        const Network = Mina.Network("https://api.minascan.io/node/devnet/v1/graphql");
        console.log("Devnet network instance configured.");
        Mina.setActiveInstance(Network);
    },
    loadContract: async ({ contractName }: { contractName: ContractName }) => {
        if (!state.contracts[contractName])
            throw new Error(`${contractName} contract is not defined`);
        if (!state.contracts[contractName]) {
            const contract = (await import(`drm-mina-contracts/build/src/${contractName}.js`))[
                contractName
            ];
            if (!contract) {
                throw new Error(`Could not load contract ${contractName} from the module`);
            }
            state.contracts[contractName] = contract;
        }
    },
    compileContract: async ({ contractName }: { contractName: ContractName }) => {
        const contract = state.contracts[contractName];
        if (!contract) throw new Error(`${contractName} contract is not loaded`);
        await contract.compile();
    },
    loadAndCompileContract: async (args: { contractName: ContractName }) => {
        await functions.loadContract(args);
        await functions.compileContract(args);
    },
    fetchAccount: async (args: { publicKey: string }) => {
        const publicKey = PublicKey.fromBase58(args.publicKey);
        return await fetchAccount({ publicKey });
    },
    getPrice: async ({ contractPublicKey }: { contractPublicKey: string }) => {
        const contract = state.contracts["GameToken"];
        if (!contract) throw new Error("GameToken contract is not loaded");
        const contractInstance = new contract(PublicKey.fromBase58(contractPublicKey));
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
    }) => {
        const contract = state.contracts["GameToken"];
        if (!contract) throw new Error("GameToken contract is not loaded");
        const contractInstance = new contract(PublicKey.fromBase58(contractPublicKey));
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
    // proveUpdateTransaction: async (args: {}) => {
    //     await state.transaction!.prove();
    // },
    // getTransactionJSON: async (args: {}) => {
    //     return state.transaction!.toJSON();
    // },
    compileProgram: async (args: {}) => {
        state.deviceIdentifierProgram = DeviceIdentifier;
        await DeviceIdentifier.compile();
    },
    // createDeviceIdentifierProof: async (args: { rawIdentifiers: RawIdentifiers }) => {
    //     if (!state.deviceIdentifierProgram) {
    //         throw new Error("Program not compiled");
    //     }

    //     const identifiers = Identifiers.fromRaw(args.rawIdentifiers);
    //     const proof: DeviceIdentifierProof = await state.deviceIdentifierProgram.proofForDevice(
    //         identifiers
    //     );
    //     return JSON.stringify(proof.toJSON(), null, 2);
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
        if (!state.deviceIdentifierProgram) {
            throw new Error("Program not compiled");
        }

        const contract = state.contracts["DRM"];
        if (!contract) throw new Error("DRM contract is not loaded");
        const contractInstance = new contract(PublicKey.fromBase58(contractPublicKey));

        const identifiers = Identifiers.fromRaw(rawIdentifiers);
        const proof: DeviceIdentifierProof = await state.deviceIdentifierProgram.proofForDevice(
            identifiers
        );

        const sender = PublicKey.fromBase58(userAddress);
        const transaction = await Mina.transaction(
            {
                sender: sender,
                fee: 1e8,
            },
            async () => {
                await contractInstance.initAndAddDevice(sender, proof, UInt64.from(deviceIndex));
            }
        );

        await transaction.prove();
        return transaction.toJSON();
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
        if (!state.deviceIdentifierProgram) {
            throw new Error("Program not compiled");
        }

        const contract = state.contracts["DRM"];
        if (!contract) throw new Error("DRM contract is not loaded");
        const contractInstance = new contract(PublicKey.fromBase58(contractPublicKey));

        const identifiers = Identifiers.fromRaw(rawIdentifiers);
        const proof: DeviceIdentifierProof = await state.deviceIdentifierProgram.proofForDevice(
            identifiers
        );

        const sender = PublicKey.fromBase58(userAddress);
        const transaction = await Mina.transaction(
            {
                sender: sender,
                fee: 1e8,
            },
            async () => {
                await contractInstance.changeDevice(sender, proof, UInt64.from(deviceIndex));
            }
        );

        await transaction.prove();
        return transaction.toJSON();
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
    addEventListener("message", async (event: MessageEvent<ZkappWorkerRequest>) => {
        const returnData = await functions[event.data.fn](event.data.args);

        const message: ZkappWorkerReponse = {
            id: event.data.id,
            data: returnData,
        };
        postMessage(message);
    });
}

console.log("Web Worker Successfully Initialized.");
