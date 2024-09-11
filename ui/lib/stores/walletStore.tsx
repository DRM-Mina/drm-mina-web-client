import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface WalletState {
    isConnected: boolean;
    walletInstalled: boolean;
    userPublicKey?: string;
    network?: string;

    initializeWallet: () => Promise<void>;
    connect: () => Promise<boolean>;
    disconnect: () => void;
}

export const useWalletStore = create<WalletState, [["zustand/immer", never]]>(
    immer((set) => ({
        isConnected: false,
        walletInstalled: false,
        userPublicKey: undefined,
        network: undefined,

        async initializeWallet() {
            if (!window.mina) {
                set((state) => {
                    state.walletInstalled = false;
                });
                return;
            }

            const network = await window.mina.requestNetwork();
            set((state) => {
                state.network = network.chainId;
            });
            // const wallet = await window.mina.getAccounts();

            // if (wallet[0]) {
            //     set((state) => {
            //         state.isConnected = true;
            //         state.walletInstalled = true;
            //         state.userPublicKey = wallet[0];
            //     });
            // }
        },

        async connect() {
            if (!window.mina) {
                return false;
            }

            const wallet = await window.mina.getAccounts();
            if (wallet[0]) {
                set((state) => {
                    state.isConnected = true;
                    state.walletInstalled = true;
                    state.userPublicKey = wallet[0];
                });
                return true;
            }

            return false;
        },

        disconnect() {
            set((state) => {
                state.isConnected = false;
                state.userPublicKey = undefined;
            });
        },
    }))
);
