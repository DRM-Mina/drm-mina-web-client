import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import WorkerClient from "../workerClient";

interface WorkerStoreState {
  isReady: boolean;
  isLoading: boolean;
  worker?: WorkerClient;
  gameTokenCompiled: boolean;
  drmCompiled: boolean;
  pricesLoaded: boolean;
  status: string;
  progress: number;

  startWorker: () => Promise<void>;
  getPrice: (contractPublicKey: string) => Promise<void>;
  getMinaBalance: (userAddress: string) => Promise<number>;
  getTokenOwnership: (
    userAddress: string,
    contractPublicKey: string
  ) => Promise<boolean>;
  buyGame: (recipient: string, contractPublicKey: string) => Promise<any>;
  getMaxDeviceAllowed: (contractAddress: string) => Promise<number>;
  getDevices: (userAddress: string, contractAddress: string) => Promise<any>;
  assignDeviceToSlot: (
    userAddress: string,
    rawIdentifiers: RawIdentifiers,
    deviceIndex: number,
    contractPublicKey: string
  ) => Promise<any>;
  deployGameToken: (
    publisher: string,
    symbol: string,
    price: number,
    discount: number,
    timeoutInterval: number,
    numberOfDevices: number
  ) => Promise<{
    GameTokenAddr: string;
    GameTokenPk: string;
    DRMAddr: string;
    DRMPk: string;
    transaction: any;
  }>;
  fetchGameTokenFields: (contractAddress: string) => Promise<{
    publisher: string;
    price: number;
    discount: number;
    timeoutInterval: number;
    numberOfDevices: number;
  }>;
  setGameTokenFields: (
    contractAddress: string,
    publisher: string,
    price: number,
    discount: number,
    timeoutInterval: number,
    numberOfDevices: number
  ) => Promise<any>;
}

async function timeout(seconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, seconds * 1000);
  });
}

export const useWorkerStore = create<
  WorkerStoreState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    isReady: false,
    isLoading: false,
    worker: undefined,

    gameTokenCompiled: false,
    drmCompiled: false,
    pricesLoaded: false,
    status: "",
    progress: 0,

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
        state.status = "Starting";
      });
      const worker = new WorkerClient();

      await timeout(5);

      set((state) => {
        state.worker = worker;
        state.progress = 5;
      });

      console.time("Active instance set to devnet");
      await worker.setActiveInstanceToDevnet();
      console.timeEnd("Active instance set to devnet");

      set((state) => {
        state.isReady = true;
        state.status = "GameToken";
        state.progress = 7;
      });
      console.timeEnd("Worker started");

      await worker.loadAndCompileGameTokenContract();

      set((state) => {
        state.gameTokenCompiled = true;
        state.status = "DeviceIdentifier";
        state.progress = 15;
      });

      await worker.compileDeviceIdentifier();

      set((state) => {
        state.status = "DeviceSession";
        state.progress = 25;
      });

      await worker.compileDeviceSession();

      set((state) => {
        state.status = "BundledDeviceSession";
        state.progress = 35;
      });

      await worker.compileBundledDeviceSession();

      set((state) => {
        state.status = "OffchainState";
        state.progress = 45;
      });

      await worker.compileOffchainState();

      set((state) => {
        state.status = "DRM";
        state.progress = 90;
      });

      await worker.loadAndCompileDRMContract();

      set((state) => {
        state.drmCompiled = true;
        state.status = "Finished";
        state.progress = 100;
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
      const balance = await this.worker.getTokenOwnership({
        userAddress,
        contractPublicKey,
      });
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

      const arr = await this.worker.getDevices({
        userAddress,
        contractAddress,
      });
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

    async deployGameToken(
      publisher: string,
      symbol: string,
      price: number,
      discount: number,
      timeoutInterval: number,
      numberOfDevices: number
    ) {
      if (!this.worker) {
        throw new Error("Worker not ready");
      }

      return JSON.parse(
        (await this.worker.deployGameToken({
          publisher,
          symbol,
          price,
          discount,
          timeoutInterval,
          numberOfDevices,
        })) as string
      );
    },

    async fetchGameTokenFields(contractAddress: string): Promise<{
      publisher: string;
      price: number;
      discount: number;
      timeoutInterval: number;
      numberOfDevices: number;
    }> {
      if (!this.worker) {
        throw new Error("Worker not ready");
      }

      const jsonString = await this.worker.fetchGameTokenFields({
        contractAddress,
      });
      return JSON.parse(jsonString) as {
        publisher: string;
        price: number;
        discount: number;
        timeoutInterval: number;
        numberOfDevices: number;
      };
    },

    async setGameTokenFields(
      contractAddress: string,
      publisher: string,
      price: number,
      discount: number,
      timeoutInterval: number,
      numberOfDevices: number
    ) {
      if (!this.worker) {
        throw new Error("Worker not ready");
      }

      const json = await this.worker.setGameTokenFields({
        contractAddress,
        publisher,
        price,
        discount,
        timeoutInterval,
        numberOfDevices,
      });
      return json;
    },
  }))
);
