import { fetchAccount } from "o1js";
import type {
  ZkappWorkerRequest,
  ZkappWorkerReponse,
  WorkerFunctions,
} from "./worker";

export default class WorkerClient {
  setActiveInstanceToDevnet() {
    return this._call("setActiveInstanceToDevnet", {});
  }

  loadAndCompileGameTokenContract() {
    return this._call("loadAndCompileGameTokenContract", {});
  }

  loadAndCompileDRMContract() {
    return this._call("loadAndCompileDRMContract", {});
  }

  async getGameTokenInstance({ contractAddress }: { contractAddress: string }) {
    const result = await this._call("getGameTokenInstance", {
      contractAddress,
    });
    return result;
  }

  fetchAccount({
    publicKey,
    tokenId,
  }: {
    publicKey: string;
    tokenId?: string;
  }): ReturnType<typeof fetchAccount> {
    const result = this._call("fetchAccount", {
      publicKey,
      tokenId,
    });
    return result as ReturnType<typeof fetchAccount>;
  }

  async getMinaBalance({ userAddress }: { userAddress: string }) {
    const result = await this._call("getMinaBalance", {
      userAddress,
    });
    return result;
  }

  async getTokenOwnership({
    userAddress,
    contractPublicKey,
  }: {
    userAddress: string;
    contractPublicKey: string;
  }) {
    const result = await this._call("getTokenOwnership", {
      userAddress,
      contractPublicKey,
    });
    return result;
  }

  async getPrice({
    contractPublicKey,
  }: {
    contractPublicKey: string;
  }): Promise<any> {
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

  async initAndAddDevice({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) {
    const result = await this._call("initAndAddDevice", {
      userAddress,
      rawIdentifiers,
      deviceIndex,
      contractPublicKey,
    });
    return result;
  }

  async changeDevice({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) {
    const result = await this._call("changeDevice", {
      userAddress,
      rawIdentifiers,
      deviceIndex,
      contractPublicKey,
    });
    return result;
  }

  async settle({
    userAddress,
    contractAddress,
  }: {
    userAddress: string;
    contractAddress: string;
  }) {
    const result = await this._call("settle", {
      contractAddress,
      userAddress,
    });
    return result;
  }

  async getMaxDeviceAllowed({ contractAddress }: { contractAddress: string }) {
    const result = await this._call("getMaxDeviceAllowed", {
      contractAddress,
    });
    return result;
  }

  async getDevices({
    userAddress,
    contractAddress,
  }: {
    userAddress: string;
    contractAddress: string;
  }) {
    console.log("worker call getDevices");
    const result = await this._call("getDevices", {
      userAddress,
      contractAddress,
    });
    return result;
  }

  async assignDeviceToSlot({
    userAddress,
    rawIdentifiers,
    deviceIndex,
    contractPublicKey,
  }: {
    userAddress: string;
    rawIdentifiers: RawIdentifiers;
    deviceIndex: number;
    contractPublicKey: string;
  }) {
    const result = await this._call("assignDeviceToSlot", {
      userAddress,
      rawIdentifiers,
      deviceIndex,
      contractPublicKey,
    });
    return result;
  }

  async deployGameToken({
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
  }) {
    const result = await this._call("deployGameToken", {
      publisher,
      symbol,
      price,
      discount,
      timeoutInterval,
      numberOfDevices,
    });
    return result;
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
