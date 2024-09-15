import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import WorkerClient from "../workerClient";
import { PublicKey } from "o1js";

interface WorkerStoreState {
    isReady: boolean;
    isLoading: boolean;
    worker?: WorkerClient;
    startWorker: () => Promise<void>;
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
        async startWorker() {
            console.log("Worker starting");

            if (this.isLoading) {
                // console.log("Worker already loading");
                return;
            }

            if (this.isReady) {
                // console.log("Worker already ready");
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

            // await worker.compileProgram();
            await worker.setActiveInstanceToDevnet();
            await worker.loadAndCompileContract({ contractName: "GameToken" });
            console.log("zkApp compiled");
            await worker.initZkappInstance({
                contractName: "GameToken",
                publicKey: PublicKey.fromBase58(
                    "B62qrESrwwpre49NNWAFcBbDNDoJa4BzTbMErccoV4p3Kt7DawZ9j7H"
                ),
            });
            console.log("zkApp initialized");

            // console.log("Fetching account");
            // const result = await worker.fetchAccount({
            //     publicKey: PublicKey.fromBase58(
            //         "B62qrESrwwpre49NNWAFcBbDNDoJa4BzTbMErccoV4p3Kt7DawZ9j7H"
            //     ),
            // });
            // console.log("Account fetched", result);

            const price = await worker.getPrice();

            console.log("Price", price);

            set((state) => {
                state.isReady = true;
            });
            return;
        },
    }))
);
