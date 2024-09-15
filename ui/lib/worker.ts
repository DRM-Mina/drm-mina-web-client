import "reflect-metadata";
import { Identifiers } from "drm-mina-contracts/build/src/lib/DeviceIdentifier";
import {
    DeviceIdentifier,
    DeviceIdentifierProof,
} from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof";
import { GameToken } from "drm-mina-contracts/build/src/GameToken";
import { fetchAccount, Mina, PublicKey } from "o1js";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

const state = {
    status: "loading" as "loading" | "ready",
    deviceIdentifierProgram: null as typeof DeviceIdentifier | null,
    contracts: {
        GameToken: {
            contract: null as null | typeof GameToken,
            zkapp: null as null | GameToken,
        },
    },
    transaction: null as null | Transaction,
    // verificationKey: null as string | null,
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
        if (!state.contracts[contractName].contract) {
            const contract = (await import(`drm-mina-contracts/build/src/${contractName}.js`))[
                contractName
            ];
            if (!contract) {
                throw new Error(`Could not load contract ${contractName} from the module`);
            }
            state.contracts[contractName].contract = contract;
        }
    },
    compileContract: async ({ contractName }: { contractName: ContractName }) => {
        const contract = state.contracts[contractName]?.contract;
        if (!contract) throw new Error(`${contractName} contract is not loaded`);
        await contract.compile();
    },
    loadAndCompileContract: async (args: { contractName: ContractName }) => {
        await functions.loadContract(args);
        await functions.compileContract(args);
    },
    fetchAccount: async (args: { publicKey58: string }) => {
        const publicKey = PublicKey.fromBase58(args.publicKey58);
        return await fetchAccount({ publicKey });
    },
    initZkappInstance: async ({
        publicKey58,
        contractName,
    }: {
        contractName: ContractName;
        publicKey58: string;
    }) => {
        const contract = state.contracts[contractName]?.contract;
        if (!contract) throw new Error(`${contractName} contract is not loaded`);
        state.contracts[contractName].zkapp = new contract(PublicKey.fromBase58(publicKey58));
    },

    getPrice: async (args: {}) => {
        const currentPrice = await state.contracts["GameToken"].zkapp!.gamePrice.fetch();
        const currentDiscount = await state.contracts["GameToken"].zkapp!.discount.fetch();
        return JSON.stringify({
            price: currentPrice?.toString(),
            discount: currentDiscount?.toString(),
        });
    },
    buyGame: async ({ recipient }: { recipient: string }) => {
        const transaction = await Mina.transaction(async () => {
            await state.contracts["GameToken"].zkapp!.mintGameToken(
                PublicKey.fromBase58(recipient)
            );
        });
        state.transaction = transaction;
    },
    proveUpdateTransaction: async (args: {}) => {
        await state.transaction!.prove();
    },
    getTransactionJSON: async (args: {}) => {
        return state.transaction!.toJSON();
    },

    compileProgram: async (args: {}) => {
        state.deviceIdentifierProgram = DeviceIdentifier;
        const deviceIdentifierKey = await DeviceIdentifier.compile();
        // state.verificationKey = deviceIdentifierKey.verificationKey.data
    },
    createDeviceIdentifierProof: async (args: { rawIdentifiers: RawIdentifiers }) => {
        if (!state.deviceIdentifierProgram) {
            throw new Error("Program not compiled");
        }

        const identifiers = Identifiers.fromRaw(args.rawIdentifiers);
        const proof: DeviceIdentifierProof = await state.deviceIdentifierProgram.proofForDevice(
            identifiers
        );
        return JSON.stringify(proof.toJSON(), null, 2);
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
