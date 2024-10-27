import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const tagList = [
    "Action",
    "Adventure",
    "RPG",
    "Racing",
    "Sports",
    "Simulation",
    "Strategy",
    "Puzzle",
    "Fighting",
    "Shooter",
    "Stealth",
    "Survival",
    "Platformer",
    "Sandbox",
    "Horror",
    "MMO",
    "Metroidvania",
    "Rhythm",
    "Idle",
    "Visual Novel",
    "Tower Defense",
    "Trivia",
    "Card",
    "MOBA",
    "Battle Royale",
    "Board Game",
    "Educational",
    "Party",
    "Artillery",
    "Pinball",
    "Music",
    "Dating Sim",
];

export function base58Decode(input: string): number {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const base = BigInt(58);
    let result = BigInt(0);

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const index = alphabet.indexOf(char);

        if (index === -1) {
            throw new Error(`Invalid Base58 character '${char}' at position ${i}`);
        }

        result = result * base + BigInt(index);
    }

    return Number(result % BigInt(Number.MAX_SAFE_INTEGER));
}
