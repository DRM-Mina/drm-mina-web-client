import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useWalletStore } from "./walletStore";
import { useGamesStore } from "./gameStore";
import { useEffect, useState } from "react";
import { useWorkerStore } from "./workerStore";
import { fetchSlotNames } from "../api";
import { useDeviceStore } from "./deviceStore";

interface UserState {
  userMinaBalance: number;
  wishlist: number[];
  library: number[];
  isLibraryFetched: boolean;
  libraryTrigger: boolean;
  gameId: number;
  slotNames: string[];
  slots: string[];

  setWishlist: (wishlist: number[]) => void;
  addWishlist: (gameId: number) => void;
  removeWishlist: (gameId: number) => void;
  setLibrary: (library: number[]) => void;
  triggerLibrary: () => void;
  setSlots: (gameId: number, slotNames: string[], slots: string[]) => void;
}

export const useUserStore = create<UserState, [["zustand/immer", never]]>(
  immer((set) => ({
    userMinaBalance: 0,
    wishlist: [],
    library: [],
    isLibraryFetched: false,
    libraryTrigger: false,
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
        state.isLibraryFetched = true;
      });
    },
    triggerLibrary() {
      set((state) => {
        state.libraryTrigger = !state.libraryTrigger;
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

export const useObserveUserLibraryRoutine = () => {
  const walletStore = useWalletStore();
  const userStore = useUserStore();
  const gameStore = useGamesStore();
  const workerStore = useWorkerStore();
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (
        isMounted &&
        walletStore.userPublicKey &&
        workerStore.isReady &&
        !fetching
      ) {
        console.log("Fetching user library...");
        setFetching(true);

        try {
          const minaBalance = await workerStore.getMinaBalance(
            walletStore.userPublicKey
          );
          userStore.userMinaBalance = Number(
            (minaBalance / 1000000000).toFixed(2)
          );

          const games = gameStore.games;
          const library = [];
          for (const game of games) {
            const isOwned = await workerStore.getTokenOwnership(
              walletStore.userPublicKey,
              game.gameTokenContractAddress
            );
            if (isOwned) {
              library.push(game.gameId);
            }
          }

          userStore.setLibrary(library);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setFetching(false);
          console.log("User library fetched!");
        }
      }

      if (isMounted) {
        setTimeout(() => {
          userStore.triggerLibrary();
        }, 5 * 60 * 1000);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [
    walletStore.isAuthenticated,
    workerStore.isReady,
    userStore.libraryTrigger,
  ]);
};

export const useObserveSlots = (game: Game) => {
  const userStore = useUserStore();
  const walletStore = useWalletStore();
  const workerStore = useWorkerStore();
  const deviceStore = useDeviceStore();
  const [fetchingDevices, setFetchingDevices] = useState<boolean>(false);
  const [canAssign, setCanAssign] = useState<boolean>(false);

  useEffect(() => {
    if (
      (deviceStore.isDeviceSet || process.env.NODE_ENV === "development") &&
      workerStore.drmCompiled &&
      walletStore.isAuthenticated &&
      game &&
      userStore.library.includes(game.gameId) &&
      !fetchingDevices
    ) {
      (async () => {
        setFetchingDevices(true);
        const slotCount = await workerStore.getMaxDeviceAllowed(
          game.gameTokenContractAddress
        );

        let slotNamesArray = await fetchSlotNames(
          walletStore.userPublicKey!,
          game.gameId
        );
        slotNamesArray = slotNamesArray.slice(0, slotCount);

        const devices = await workerStore.getDevices(
          walletStore.userPublicKey!,
          game.DRMContractAddress
        );

        let slotArray: string[] = [];
        if (devices) {
          for (let i = 0; i <= slotCount - 1; i++) {
            console.log(devices[i], devices[i] === "0");
            slotArray.push(
              devices[i] === "0" ? "Empty" : devices[i].slice(0, 6) + "..."
            );
          }
        } else {
          for (let i = 0; i < slotCount; i++) {
            slotArray.push("Empty");
          }
        }
        setFetchingDevices(false);

        userStore.setSlots(game.gameId, slotNamesArray, slotArray);

        if (devices) {
          setCanAssign(true);
        }
      })();
    }
  }, [
    walletStore.isAuthenticated,
    userStore.library,
    userStore.gameId,
    workerStore.drmCompiled,
  ]);

  return { canAssign, fetchingDevices };
};
