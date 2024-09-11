import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

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
