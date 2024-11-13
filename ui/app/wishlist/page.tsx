"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { useGamesStore } from "@/lib/stores/gameStore";
import { useEffect } from "react";
import { fetchWishlist } from "@/lib/api";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";

const ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export default function Wishlist() {
  const router = useRouter();

  const gameStore = useGamesStore();

  const userStore = useUserStore();

  const walletStore = useWalletStore();

  useEffect(() => {
    if (walletStore.isAuthenticated) {
      fetchWishlist(walletStore.userPublicKey || "").then((data) => {
        userStore.setWishlist(data);
      });
    }
  }, []);

  return walletStore.isAuthenticated ? (
    <div className=" p-8">
      {userStore.wishlist.length === 0 ? (
        <div className=" flex w-full justify-center ">
          <h2 className="mb-2 text-lg font-medium tracking-tight">
            Your Wishlist Is Empty
          </h2>

          <h3
            className="absolute top-1/2 mb-2 cursor-pointer align-middle text-lg font-medium tracking-tight underline underline-offset-2 hover:underline-offset-4"
            onClick={() => router.push("/store")}
          >
            Explore the store
          </h3>
        </div>
      ) : (
        <div className=" flex w-full flex-wrap justify-center gap-4">
          {gameStore.games
            .filter((game: Game) => userStore.wishlist.includes(game.gameId))
            .map((game, index) => {
              return (
                <Card
                  key={index}
                  className=" card-hover-effect mb-16 aspect-square w-[300px] cursor-pointer"
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
                      className="card-image flex h-full w-full rounded-lg object-cover"
                    />
                  </CardContent>
                  <div className="card-drawer flex h-full flex-col items-center gap-3 bg-background p-6">
                    <CardTitle className="flex items-center justify-center text-center">
                      {game.name}
                    </CardTitle>
                    <CardDescription className=" flex items-center justify-center text-center">
                      {game.description}
                    </CardDescription>
                  </div>
                  <CardFooter className="mt-4 flex justify-between">
                    <h3 className="text-lg font-medium">{game.name}</h3>
                    <h3 className="text-lg font-medium">{game.price}</h3>
                  </CardFooter>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  ) : (
    <div className=" p-8">
      <div className="flex h-[80vh] items-center justify-center">
        <h3 className="text-3xl font-medium">
          Please connect your wallet to view your wishlist
        </h3>
      </div>
    </div>
  );
}
