import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import WorkerClient from "../workerClient";

interface WorkerStoreState {
    isReady: boolean;
    isLoading: boolean;
    worker?: WorkerClient;

    contractsCompiled: boolean;
    pricesLoaded: boolean;

    startWorker: () => Promise<void>;
    loadAndCompile: () => Promise<void>;
    getPrices: () => Promise<void>;
    buyGame: (recipient: string, contractPublicKey: string) => Promise<any>;
    initAndAddDevice: (
        userAddress: string,
        rawIdentifiers: RawIdentifiers,
        deviceIndex: number,
        contractPublicKey: string
    ) => Promise<any>;
    changeDevice: (
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

        contractsCompiled: false,
        pricesLoaded: false,

        async startWorker() {
            console.log("Worker starting");

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

            set((state) => {
                state.isReady = true;
            });
            console.log("Worker started");
            return;
        },

        async loadAndCompile() {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }
            await this.worker.compileProgram();
            await this.worker.compileContract({ contractName: "GameToken" });
            await this.worker.compileContract({ contractName: "DRM" });
        },

        async getPrices() {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }
        },

        async buyGame(recipient: string, contractPublicKey: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.buyGame({ recipient, contractPublicKey });
            return json;
        },

        async initAndAddDevice(
            userAddress: string,
            rawIdentifiers: RawIdentifiers,
            deviceIndex: number,
            contractPublicKey: string
        ) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.initAndAddDevice({
                userAddress,
                rawIdentifiers,
                deviceIndex,
                contractPublicKey,
            });
            return json;
        },

        async changeDevice(
            userAddress: string,
            rawIdentifiers: RawIdentifiers,
            deviceIndex: number,
            contractPublicKey: string
        ) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.changeDevice({
                userAddress,
                rawIdentifiers,
                deviceIndex,
                contractPublicKey,
            });
            return json;
        },
    }))
);
