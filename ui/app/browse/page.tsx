"use client";
import { Suspense } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useGamesStore } from "@/lib/stores/gameStore";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

function GamesList() {
    const router = useRouter();
    const params = useSearchParams().get("search") || "";
    const gameStore = useGamesStore();
    const [games, setGames] = useState<Game[]>([]);

    useEffect(
        () =>
            setGames(
                gameStore.games.filter((game) =>
                    game.name.toLowerCase().replace(" ", "").includes(params.toLowerCase())
                )
            ),
        [params]
    );

    return (
        <div className="grid grid-cols-4 gap-4 p-8">
            {games.map((game) => (
                <Card
                    key={game.gameId}
                    className=" mb-16 aspect-square w-[300px] cursor-pointer"
                    onClick={() => router.push("/game-detail?game=" + game.name)}
                >
                    <CardContent className=" absolute flex aspect-square w-[300px] items-center justify-center p-4">
                        <img
                            src={
                                ENDPOINT +
                                "images/" +
                                game.imageFolder +
                                "/10/" +
                                game.imageFolder +
                                ".webp"
                            }
                            crossOrigin="anonymous"
                            alt={game.name}
                            className="flex h-full w-full rounded-lg object-cover"
                        />
                    </CardContent>
                    <div className="card-drawer flex h-full flex-col items-center gap-3 bg-background p-3"></div>
                    <CardFooter className="mt-4 flex justify-between">
                        <h3 className="text-lg font-medium">{game.name}</h3>
                        <h3 className="text-lg font-medium">
                            {game.price - game.discount}
                            <img src={"/mina.webp"} alt="mina" className=" inline h-4 w-4" />
                        </h3>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

export default function Browse() {
    return (
        <Suspense fallback={<div>Loading games...</div>}>
            <GamesList />
        </Suspense>
    );
}
