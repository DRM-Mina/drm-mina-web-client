"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface WalletState {
  isConnected: boolean;
  isAuthenticated: boolean;
  walletInstalled: boolean;
  userPublicKey?: string;
  network?: string;

  setWalletInstalled: (
    walletInstalled: boolean,
    userPublicKey?: string,
    network?: string
  ) => void;
  observeWalletChange: () => void;
  connect: () => Promise<number>;
  disconnect: () => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

export const useWalletStore = create<WalletState, [["zustand/immer", never]]>(
  immer((set) => ({
    isConnected: false,
    isAuthenticated: false,
    walletInstalled: false,
    userPublicKey: undefined,
    network: undefined,

    setWalletInstalled: (
      walletInstalled: boolean,
      userPublicKey?: string,
      network?: string
    ) =>
      set({
        walletInstalled,
        userPublicKey,
        network,
      }),
    observeWalletChange() {
      if (typeof window.mina === "undefined") {
        return;
      }

      window.mina.on("accountsChanged", ([wallet]) => {
        set((state) => {
          state.userPublicKey = wallet;
          state.isConnected = !!wallet;
          state.isAuthenticated = false;
        });
      });
    },

    async connect() {
      if (window.mina === undefined) {
        console.error("Mina wallet not installed");
        return 0;
      }

      try {
        const wallet = await window.mina.requestAccounts();
        await window.mina?.switchChain({ networkID: "mina:testnet" });
        // const network = await window.mina.requestNetwork();
        if (wallet[0]) {
          set((state) => {
            state.isConnected = true;
            state.walletInstalled = true;
            state.userPublicKey = wallet[0];
          });
          //   window.mina.on("accountsChanged", ([wallet]) => {
          //     set((state) => {
          //       state.userPublicKey = wallet;
          //       state.isConnected = !!wallet;
          //       state.isAuthenticated = false;
          //     });
          //   });
          return 1;
        }
      } catch (e) {
        return 2;
      }

      return 2;
    },

    disconnect: () =>
      set({
        isConnected: false,
        userPublicKey: undefined,
        isAuthenticated: false,
      }),
    setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  }))
);
