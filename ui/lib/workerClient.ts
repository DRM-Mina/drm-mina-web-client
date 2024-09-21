import { fetchAccount } from "o1js";
import type { ZkappWorkerRequest, ZkappWorkerReponse, WorkerFunctions } from "./worker";

export default class WorkerClient {
    setActiveInstanceToDevnet() {
        return this._call("setActiveInstanceToDevnet", {});
    }

    loadAndCompileGameTokenContract() {
        return this._call("loadAndCompileGameTokenContract", {});
    }

    async getGameTokenInstance({ contractAddress }: { contractAddress: string }) {
        const result = await this._call("getGameTokenInstance", {
            contractAddress,
        });
        return result;
    }

    compileProgram() {
        return this._call("compileProgram", {});
    }

    fetchAccount({ publicKey }: { publicKey: string }): ReturnType<typeof fetchAccount> {
        const result = this._call("fetchAccount", {
            publicKey,
        });
        return result as ReturnType<typeof fetchAccount>;
    }

    async getPrice({ contractPublicKey }: { contractPublicKey: string }): Promise<any> {
        const result = await this._call("getPrice", {
            contractPublicKey,
        });
        return JSON.parse(result as string);
    }

    async buyGame({
        recipient,
        contractPublicKey,
    }: {
        recipient: string;
        contractPublicKey: string;
    }) {
        const result = await this._call("buyGame", {
            recipient,
            contractPublicKey,
        });
        return result;
    }

    // async initAndAddDevice({
    //     userAddress,
    //     rawIdentifiers,
    //     deviceIndex,
    //     contractPublicKey,
    // }: {
    //     userAddress: string;
    //     rawIdentifiers: RawIdentifiers;
    //     deviceIndex: number;
    //     contractPublicKey: string;
    // }) {
    //     const result = await this._call("initAndAddDevice", {
    //         userAddress,
    //         rawIdentifiers,
    //         deviceIndex,
    //         contractPublicKey,
    //     });
    //     return result;
    // }

    // async changeDevice({
    //     userAddress,
    //     rawIdentifiers,
    //     deviceIndex,
    //     contractPublicKey,
    // }: {
    //     userAddress: string;
    //     rawIdentifiers: RawIdentifiers;
    //     deviceIndex: number;
    //     contractPublicKey: string;
    // }) {
    //     const result = await this._call("changeDevice", {
    //         userAddress,
    //         rawIdentifiers,
    //         deviceIndex,
    //         contractPublicKey,
    //     });
    //     return result;
    // }

    worker: Worker;

    promises: {
        [id: number]: { resolve: (res: any) => void; reject: (err: any) => void };
    };

    nextId: number;

    constructor() {
        this.worker = new Worker(new URL("./worker.ts", import.meta.url));
        this.promises = {};
        this.nextId = 0;

        this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
            this.promises[event.data.id].resolve(event.data.data);
            delete this.promises[event.data.id];
        };
    }

    _call(fn: WorkerFunctions, args: any) {
        return new Promise((resolve, reject) => {
            this.promises[this.nextId] = { resolve, reject };

            const message: ZkappWorkerRequest = {
                id: this.nextId,
                fn,
                args,
            };

            this.worker.postMessage(message);

            this.nextId++;
        });
    }
}
