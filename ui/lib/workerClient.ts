import { fetchAccount, PublicKey } from "o1js";
import type {
    ZkappWorkerRequest,
    ZkappWorkerReponse,
    WorkerFunctions,
    ContractName,
} from "./worker";

export default class WorkerClient {
    setActiveInstanceToDevnet() {
        return this._call("setActiveInstanceToDevnet", {});
    }

    loadAndCompileContract(args: { contractName: ContractName }) {
        return this._call("loadAndCompileContract", args);
    }

    loadContract(args: { contractName: ContractName }) {
        return this._call("loadContract", args);
    }

    compileContract(args: { contractName: ContractName }) {
        return this._call("compileContract", args);
    }

    compileProgram() {
        return this._call("compileProgram", {});
    }

    fetchAccount({ publicKey }: { publicKey: PublicKey }): ReturnType<typeof fetchAccount> {
        const result = this._call("fetchAccount", {
            publicKey58: publicKey.toBase58(),
        });
        return result as ReturnType<typeof fetchAccount>;
    }

    initZkappInstance({
        contractName,
        publicKey,
    }: {
        contractName: ContractName;
        publicKey: PublicKey;
    }) {
        return this._call("initZkappInstance", {
            contractName,
            publicKey58: publicKey.toBase58(),
        });
    }

    async getPrice(): Promise<any> {
        const result = await this._call("getPrice", {});
        return JSON.parse(result as string);
    }

    buyGame({ recipient }: { recipient: string }) {
        return this._call("buyGame", {
            recipient,
        });
    }

    proveUpdateTransaction() {
        return this._call("proveUpdateTransaction", {});
    }

    async getTransactionJSON() {
        const result = await this._call("getTransactionJSON", {});
        return result;
    }

    // createDeviceIdentifierProof({
    //     rawIdentifiers,
    // }: {
    //     rawIdentifiers: RawIdentifiers;
    // }): Promise<any> {
    //     return this._call("createDeviceIdentifierProof", {
    //         rawIdentifiers,
    //     }) as Promise<any>;
    // }

    initAndAddDevice({
        userAddress,
        rawIdentifiers,
        deviceIndex,
    }: {
        userAddress: string;
        rawIdentifiers: RawIdentifiers;
        deviceIndex: number;
    }) {
        return this._call("initAndAddDevice", {
            userAddress,
            rawIdentifiers,
            deviceIndex,
        });
    }

    changeDevice({
        userAddress,
        rawIdentifiers,
        deviceIndex,
    }: {
        userAddress: string;
        rawIdentifiers: RawIdentifiers;
        deviceIndex: number;
    }) {
        return this._call("changeDevice", {
            userAddress,
            rawIdentifiers,
            deviceIndex,
        });
    }

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
