import { useEffect } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface WalletState {
    isConnected: boolean;
    isAuthenticated: boolean;
    walletInstalled: boolean;
    userPublicKey?: string;
    network?: string;

    initializeWallet: () => Promise<void>;
    setWalletInstalled: (
        walletInstalled: boolean,
        userPublicKey?: string,
        network?: string
    ) => void;
    observeWalletChange: () => void;
    connect: () => Promise<boolean>;
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

        async initializeWallet() {
            if (typeof mina === "undefined") {
                throw new Error("Auro wallet not installed");
            }

            const [wallet] = await mina.getAccounts();

            set((state) => {
                state.userPublicKey = wallet;
            });
        },

        setWalletInstalled: (walletInstalled: boolean, userPublicKey?: string, network?: string) =>
            set({
                walletInstalled,
                userPublicKey,
                network,
            }),
        observeWalletChange() {
            if (typeof mina === "undefined") {
                throw new Error("Auro wallet not installed");
            }

            mina.on("accountsChanged", ([wallet]) => {
                set((state) => {
                    state.userPublicKey = wallet;
                });
            });
        },

        async connect() {
            if (!mina) {
                return false;
            }
            const wallet = await mina.requestAccounts();
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

        disconnect: () =>
            set({
                isConnected: false,
                userPublicKey: undefined,
            }),
        setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
    }))
);

export const initializeWallet = () => {
    const walletStore = useWalletStore();

    useEffect(() => {
        if (!mina) {
            walletStore.setWalletInstalled(false, undefined, undefined);
            return;
        }

        (async () => {
            const network = (await mina.requestNetwork()).chainId;
            const wallet = await mina.getAccounts();

            if (wallet[0]) {
                walletStore.setWalletInstalled(true, wallet[0], network);
            } else {
                walletStore.setWalletInstalled(false, undefined, network);
            }
        })();
        console.log("Wallet initialized");
        console.log(walletStore);
    }, []);
};
