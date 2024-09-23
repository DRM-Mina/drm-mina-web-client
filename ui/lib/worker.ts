import "reflect-metadata";
import { Identifiers } from "drm-mina-contracts/build/src/lib/DeviceIdentifier";
import {
    DeviceIdentifier,
    DeviceIdentifierProof,
} from "drm-mina-contracts/build/src/lib/DeviceIdentifierProof";
import { GameToken } from "drm-mina-contracts/build/src/GameToken";
import { DRM } from "drm-mina-contracts/build/src/DRM";
import { AccountUpdate, fetchAccount, Mina, PublicKey, TokenId, UInt64 } from "o1js";
import { offchainState } from "drm-mina-contracts";

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
            [contractAddress: string]: {
                instance: DRM;
                offchainState: typeof offchainState;
            };
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
    loadAndCompileGameTokenContract: async (args: {}) => {
        if (!state.GameToken.contract) {
            const contract = (await import(`drm-mina-contracts/build/src/GameToken.js`))[
                "GameToken"
            ];
            if (!contract) {
                throw new Error(`Could not load contract GameToken from the module`);
            }
            state.GameToken.contract = contract;
        }
        await state.GameToken.contract.compile();
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
            const contract = (await import(`drm-mina-contracts/build/src/DRM.js`))["DRM"];
            if (!contract) {
                throw new Error(`Could not load contract DRM from the module`);
            }
            state.DRM.contract = contract;
        }

        if (state.DRM.instances[contractAddress]) {
            return state.DRM.instances[contractAddress];
        }

        const instance = new state.DRM.contract(PublicKey.fromBase58(contractAddress));

        const offchainStateInstance = Object.create(offchainState);
        offchainStateInstance.setContractInstance(instance);

        console.time("Compile OffchainState");
        await offchainStateInstance.compile();
        console.timeEnd("Compile OffchainState");

        console.time("Compile DRM");
        await state.DRM.contract.compile();
        console.timeEnd("Compile DRM");

        state.DRM.instances[contractAddress] = {
            instance,
            offchainState: offchainStateInstance,
        };

        return state.DRM.instances[contractAddress];
    },

    fetchAccount: async (args: { publicKey: string; tokenId?: string }) => {
        const publicKey = PublicKey.fromBase58(args.publicKey);
        return await fetchAccount({
            publicKey,
            tokenId: args.tokenId ? TokenId.fromBase58(args.tokenId) : undefined,
        });
    },

    getMinaBalance: async ({ userAddress }: { userAddress: string }) => {
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
    }) => {
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
    getPrice: async ({ contractPublicKey }: { contractPublicKey: string }) => {
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
    }) => {
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

    compileProgram: async (args: {}) => {
        state.deviceIdentifierProgram = DeviceIdentifier;
        await DeviceIdentifier.compile();
    },

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

        const { instance: contractInstance } = await functions.getDRMInstance({
            contractAddress: contractPublicKey,
        });

        const gameTokenAddress = await contractInstance.gameTokenAddress.fetch();

        if (!gameTokenAddress) {
            throw new Error("GameToken address not found");
        }

        await fetchAccount({
            publicKey: gameTokenAddress,
        });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(contractPublicKey),
        });

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

        const { instance: contractInstance } = await functions.getDRMInstance({
            contractAddress: contractPublicKey,
        });

        const gameTokenAddress = await contractInstance.gameTokenAddress.fetch();

        if (!gameTokenAddress) {
            throw new Error("GameToken address not found");
        }

        await fetchAccount({
            publicKey: gameTokenAddress,
        });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(contractPublicKey),
        });

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

    settle: async ({
        contractAddress,
        userAddress,
    }: {
        contractAddress: string;
        userAddress: string;
    }) => {
        const { instance: contractInstance, offchainState: drmState } =
            await functions.getDRMInstance({
                contractAddress,
            });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(userAddress),
        });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(contractAddress),
        });

        let proof = await drmState.createSettlementProof();

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

    getDevices: async ({
        userAddress,
        contractAddress,
    }: {
        userAddress: string;
        contractAddress: string;
    }) => {
        const { offchainState: drmState } = await functions.getDRMInstance({
            contractAddress: contractAddress,
        });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(userAddress),
        });

        await fetchAccount({
            publicKey: PublicKey.fromBase58(contractAddress),
        });

        const devices = await drmState.fields.devices.get(PublicKey.fromBase58(userAddress));

        return [
            devices.value.device_1.toString(),
            devices.value.device_2.toString(),
            devices.value.device_3.toString(),
            devices.value.device_4.toString(),
        ];
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
