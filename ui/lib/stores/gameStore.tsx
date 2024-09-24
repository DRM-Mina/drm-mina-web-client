import { useEffect } from "react";
import { create } from "zustand";
import { fetchGameData } from "../api";
import useHasMounted from "../customHooks";

interface GameStoreState {
    games: Game[];
    isGameSet: boolean;
    discountGames: Game[];
    setGames: (gameList: Game[]) => void;
    setDiscountGames: (gameList: Game[]) => void;
}

export const useGamesStore = create<GameStoreState>()((set) => ({
    games: [],
    isGameSet: false,
    discountGames: [],
    setGames: (gameList) => set({ games: gameList, isGameSet: true }),
    setDiscountGames: (gameList) => set({ discountGames: gameList }),
}));

export const useObserveGames = () => {
    const gameStore = useGamesStore();

    const hasMounted = useHasMounted();
    useEffect(() => {
        (async () => {
            console.log("fetching games");
            const games: Game[] = await fetchGameData();
            let gameList: Game[] = [];
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
        })();
    }, [hasMounted]);
};
