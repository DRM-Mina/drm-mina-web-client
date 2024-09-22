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
    getTokenOwnership: (userAddress: string, contractPublicKey: string) => Promise<boolean>;
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
            // console.time("DeviceIdentifierProgram compiled");
            // await worker.compileProgram();
            // console.timeEnd("DeviceIdentifierProgram compiled");

            console.time("GameToken contract compiled");
            await worker.loadAndCompileGameTokenContract();
            console.timeEnd("GameToken contract compiled");

            set((state) => {
                state.gameTokenCompiled = true;
            });
            return;
        },

        async getPrice(contractPublicKey: string) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            const json = await this.worker.getPrice({ contractPublicKey });
            return json;
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

        async initAndAddDevice(
            userAddress: string,
            rawIdentifiers: RawIdentifiers,
            deviceIndex: number,
            contractPublicKey: string
        ) {
            if (!this.worker) {
                throw new Error("Worker not ready");
            }

            // const json = await this.worker.initAndAddDevice({
            //     userAddress,
            //     rawIdentifiers,
            //     deviceIndex,
            //     contractPublicKey,
            // });
            // return json;
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

            // const json = await this.worker.changeDevice({
            //     userAddress,
            //     rawIdentifiers,
            //     deviceIndex,
            //     contractPublicKey,
            // });
            // return json;
        },
    }))
);
