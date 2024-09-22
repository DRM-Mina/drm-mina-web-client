import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useWalletStore } from "./walletStore";
import { useGamesStore } from "./gameStore";
import { useEffect, useState } from "react";
import { useWorkerStore } from "./workerStore";

interface UserState {
    wishlist: number[];
    library: number[];
    gameId: number;
    slotNames: string[];
    slots: string[];

    setWishlist: (wishlist: number[]) => void;
    addWishlist: (gameId: number) => void;
    removeWishlist: (gameId: number) => void;
    setLibrary: (library: number[]) => void;
    setSlots: (gameId: number, slotNames: string[], slots: string[]) => void;
}

export const useUserStore = create<UserState, [["zustand/immer", never]]>(
    immer((set) => ({
        isConnected: false,
        walletInstalled: false,
        userMinaBalance: 0,
        wishlist: [],
        library: [],
        gameId: 0,
        slotNames: [],
        slots: [],

        setWishlist(wishlist) {
            set((state) => {
                state.wishlist = wishlist;
            });
        },
        addWishlist(gameId) {
            set((state) => {
                state.wishlist.push(gameId);
            });
        },
        removeWishlist(gameId) {
            set((state) => {
                state.wishlist = state.wishlist.filter((id) => id !== gameId);
            });
        },
        setLibrary(library) {
            set((state) => {
                state.library = library;
            });
        },
        setSlots(gameId, slotNames, slots) {
            set((state) => {
                state.gameId = gameId;
                state.slotNames = slotNames;
                state.slots = slots;
            });
        },
    }))
);

export const useObserveUserLibrary = () => {
    const walletStore = useWalletStore();
    const userStore = useUserStore();
    const gameStore = useGamesStore();
    const workerStore = useWorkerStore();
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        (async () => {
            if (walletStore.userPublicKey && workerStore.isReady && !fetching) {
                setFetching(true);
                const games = gameStore.games;
                for (const game of games) {
                    const isOwned = await workerStore.getTokenOwnership(
                        walletStore.userPublicKey,
                        game.gameTokenContractAddress
                    );
                    if (isOwned) {
                        userStore.setLibrary([...userStore.library, game.gameId]);
                    }
                }
                setFetching(false);
            }
        })();
    }, [walletStore.userPublicKey, workerStore.isReady]);
};
