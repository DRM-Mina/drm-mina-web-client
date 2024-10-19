import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import WorkerClient from "../workerClient";

interface WorkerStoreState {
    isReady: boolean;
    isLoading: boolean;
    worker?: WorkerClient;

    gameTokenCompiled: boolean;
    pricesLoaded: boolean;

    startWorker: () => Promise<void>;
    getPrice: (contractPublicKey: string) => Promise<void>;
    getMinaBalance: (userAddress: string) => Promise<number>;
    getTokenOwnership: (userAddress: string, contractPublicKey: string) => Promise<boolean>;
    buyGame: (recipient: string, contractPublicKey: string) => Promise<any>;
    // initAndAddDevice: (
    //     userAddress: string,
    //     rawIdentifiers: RawIdentifiers,
    //     deviceIndex: number,
    //     contractPublicKey: string
    // ) => Promise<any>;
    // changeDevice: (
    //     userAddress: string,
    //     rawIdentifiers: RawIdentifiers,
    //     deviceIndex: number,
    //     contractPublicKey: string
    // ) => Promise<any>;
    // settle: (userAddress: string, contractAddress: string) => Promise<any>;
    getMaxDeviceAllowed: (contractAddress: string) => Promise<number>;
    getDevices: (userAddress: string, contractAddress: string) => Promise<any>;
    assignDeviceToSlot: (
        userAddress: string,
        rawIdentifiers: RawIdentifiers,
        deviceIndex: number,
        contractPublicKey: string
    ) => Promise<any>;
}

async function timeout(seconds: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, seconds * 1000);
    });
}

export const useWorkerStore = create<WorkerStoreState, [["zustand/immer", never]]>(
    immer((set) => ({
        isReady: false,
        isLoading: false,
        worker: undefined,

        gameTokenCompiled: false,
        pricesLoaded: false,

        async startWorker() {
            console.time("Worker started");

            if (this.isLoading) {
                return;
            }

            if (this.isReady) {
                return;
            }

            set((state) => {
                state.isLoading = true;
            });
            const worker = new WorkerClient();

            await timeout(5);

            set((state) => {
                state.worker = worker;
            });

            console.time("Active instance set to devnet");
            await worker.setActiveInstanceToDevnet();
            console.timeEnd("Active instance set to devnet");

            set((state) => {
                state.isReady = true;
            });
            console.timeEnd("Worker started");

            console.time("GameToken contract compiled");
            await worker.loadAndCompileGameTokenContract();
            console.timeEnd("GameToken contract compiled");

            set((state) => {
                state.gameTokenCompiled = true;
            });

            console.time("DRM contract compiled");
            await worker.loadAndCompileDRMContract();
            console.timeEnd("DRM contract compiled");
            return;
        },

        async getPrice(contractPublicKey: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.getPrice({ contractPublicKey });
            return json;
        },

        async getMinaBalance(userAddress: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const balance = await this.worker.getMinaBalance({ userAddress });
            return Number(balance);
        },

        async getTokenOwnership(userAddress: string, contractPublicKey: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }
            console.log("Getting token ownership", userAddress, contractPublicKey);
            const balance = await this.worker.getTokenOwnership({ userAddress, contractPublicKey });
            console.log("Balance: ", balance);
            return Number(balance) > 0;
        },

        async buyGame(recipient: string, contractPublicKey: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.buyGame({ recipient, contractPublicKey });
            return json;
        },

        // async initAndAddDevice(
        //     userAddress: string,
        //     rawIdentifiers: RawIdentifiers,
        //     deviceIndex: number,
        //     contractPublicKey: string
        // ) {
        //     if (!this.worker) {
        //         throw new Error("Worker not ready");
        //     }

        //     const json = await this.worker.initAndAddDevice({
        //         userAddress,
        //         rawIdentifiers,
        //         deviceIndex,
        //         contractPublicKey,
        //     });
        //     return json;
        // },

        // async changeDevice(
        //     userAddress: string,
        //     rawIdentifiers: RawIdentifiers,
        //     deviceIndex: number,
        //     contractPublicKey: string
        // ) {
        //     if (!this.worker) {
        //         throw new Error("Worker not ready");
        //     }

        //     const json = await this.worker.changeDevice({
        //         userAddress,
        //         rawIdentifiers,
        //         deviceIndex,
        //         contractPublicKey,
        //     });
        //     return json;
        // },

        // async settle(userAddress: string, contractAddress: string) {
        //     if (!this.worker) {
        //         throw new Error("Worker not ready");
        //     }

        //     const json = await this.worker.settle({ userAddress, contractAddress });
        //     return json;
        // },

        async getMaxDeviceAllowed(contractAddress: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const max = await this.worker.getMaxDeviceAllowed({ contractAddress });
            return Number(max);
        },

        async getDevices(userAddress: string, contractAddress: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const arr = await this.worker.getDevices({ userAddress, contractAddress });
            return arr;
        },

        async assignDeviceToSlot(
            userAddress: string,
            rawIdentifiers: RawIdentifiers,
            deviceIndex: number,
            contractPublicKey: string
        ) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.assignDeviceToSlot({
                userAddress,
                rawIdentifiers,
                deviceIndex,
                contractPublicKey,
            });
            return json;
        },
    }))
);
