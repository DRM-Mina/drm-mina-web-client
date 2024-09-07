import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface registeredGame {
    gameId: number;
    price: number;
    discount: number;
    timeoutInterval: number;
    numberOfDevices: number;
}

export interface GameRegisterState {
    registeredGames: number[];
    setRegisteredGames: (games: number[]) => void;

    registeredGameList: registeredGame[];
    setRegisteredGameList: (games: registeredGame[]) => void;

    trigger: boolean;
    setTrigger: (trigger: boolean) => void;
}

export const useRegisterStore = create<GameRegisterState, [["zustand/immer", never]]>(
    immer((set) => ({
        registeredGames: [],
        setRegisteredGames: (games) => set((state) => void (state.registeredGames = games)),

        registeredGameList: [],
        setRegisteredGameList: (gameList) =>
            set((state) => void (state.registeredGameList = gameList)),

        trigger: false,
        setTrigger: (trigger) => set((state) => void (state.trigger = trigger)),
    }))
);
