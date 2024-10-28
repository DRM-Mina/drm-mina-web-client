import { useEffect } from "react";
import { create } from "zustand";
import { fetchGameData } from "../api";
import useHasMounted from "../customHooks";

interface GameStoreState {
    games: Game[];
    isGameSet: boolean;
    discountGames: Game[];
    trigger: boolean;
    setTrigger: () => void;
    setGames: (gameList: Game[]) => void;
    setDiscountGames: (gameList: Game[]) => void;
}

export const useGamesStore = create<GameStoreState>()((set) => ({
    games: [],
    isGameSet: false,
    discountGames: [],
    trigger: false,
    setTrigger: () => set((state) => ({ trigger: !state.trigger })),
    setGames: (gameList) => set({ games: gameList, isGameSet: true }),
    setDiscountGames: (gameList) => set({ discountGames: gameList }),
}));

export const useObserveGames = () => {
    const gameStore = useGamesStore();

    const hasMounted = useHasMounted();
    useEffect(() => {
        if (hasMounted) {
            (async () => {
                try {
                    const games: Game[] = await fetchGameData();
                    console.log("games: ", games);
                    let discountGames: Game[] = [];
                    games.forEach((game) => {
                        if (!game.imageFolder) {
                            game.imageFolder = "default";
                        }
                        if (game.discount > 0) {
                            discountGames.push(game);
                        }
                    });
                    gameStore.setGames(games);
                    gameStore.setDiscountGames(discountGames);
                } catch (error) {
                    console.log("Error in useObserveGames: ", error);
                }
            })();
        }
    }, [hasMounted, gameStore.trigger]);
};
