import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useGamesStore } from "@/lib/stores/gameStore";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserStore } from "@/lib/stores/userStore";
import Windows from "../downloads/windows";
import Linux from "../downloads/linux";
import MacOS from "../downloads/macos";

const ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export default function DynamicLibrary() {
  const router = useRouter();
  const userStore = useUserStore();
  const gameStore = useGamesStore();

  const { toast } = useToast();

  const handleGameDownload = async (game: Game, platfom: string) => {
    let fileName = "";
    try {
      if (platfom === "windows") {
        if (game?.downloadable) {
          fileName = game?.imageFolder + ".exe";
        } else {
          fileName = "Game-Demo-" + game?.gameId + ".exe";
        }
      } else if (platfom === "linux") {
        if (game?.downloadable) {
          fileName = game?.imageFolder + ".tar.gz";
        } else {
          fileName = "Game-Demo-" + game?.gameId + ".tar.gz";
        }
      } else if (platfom === "macos") {
        fileName = game?.imageFolder + ".zip";
      } else {
        fileName = "Game-Demo-" + game?.gameId + ".zip";
      }

      const signedUrlResponse = await fetch(
        process.env.NEXT_PUBLIC_API_ENDPOINT + "get-signed-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: fileName,
          }),
        }
      );

      if (!signedUrlResponse.ok) {
        throw new Error("Failed to get signed url from server");
      }
      toast({
        title: "Download started",
        description: "Please wait while we download the game for you 🚀",
      });
      const { url } = await signedUrlResponse.json();

      const downloadResponse = await fetch(url);
      if (!downloadResponse.ok) {
        throw new Error(
          "Server could not find file, maybe we do not have it yet 😢"
        );
      }
      const blob = await downloadResponse.blob();
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(urlBlob);

      toast({
        title: "Download complete",
        description: "Please check your download folder 😏",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Sowwy 😢",
        description: error.message,
      });
    }

    return;
  };

  return (
    <>
      {userStore.library.length === 0 && userStore.isLibraryFetched && (
        <div className=" flex w-full justify-center ">
          <h2 className="mb-2 text-lg font-medium tracking-tight">
            Your Library Is Empty
          </h2>

          <h3
            className="absolute top-1/2 mb-2 cursor-pointer align-middle text-lg font-medium tracking-tight underline underline-offset-2 hover:underline-offset-4"
            onClick={() => router.push("/store")}
          >
            Explore the store
          </h3>
        </div>
      )}
      {userStore.library.length === 0 && !userStore.isLibraryFetched && (
        <div className=" flex w-full justify-center ">
          <h2 className="mb-2 text-lg font-medium tracking-tight">
            Fetching Library...
          </h2>

          <h3
            className="absolute top-1/2 mb-2 cursor-pointer align-middle text-lg font-medium tracking-tight underline underline-offset-2 hover:underline-offset-4"
            onClick={() => router.push("/store")}
          >
            Explore the store
          </h3>
        </div>
      )}
      {userStore.library.length > 0 && (
        <div className=" flex w-full flex-col items-center justify-center gap-6">
          <h3 className="mb-2 text-lg font-medium tracking-tight">
            Owned Games
          </h3>
          {gameStore.games
            .filter((game: Game) => userStore.library.includes(game.gameId))
            .map((game, index) => {
              return (
                <Card
                  key={index}
                  className=" card-hover-effect grid w-2/3 cursor-pointer grid-cols-8 items-center"
                  onClick={() => router.push("/game-detail?game=" + game.name)}
                >
                  <CardContent className=" col-span-3 aspect-video items-center justify-center p-4">
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

                  <CardContent className=" col-span-3 items-center">
                    <CardTitle className=" pb-2 pt-6">{game.name}</CardTitle>
                    <CardDescription className="line-clamp-3 py-2">
                      {game.description}
                    </CardDescription>
                  </CardContent>
                  <CardContent
                    className=" col-span-2 flex items-center justify-center"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <Popover>
                      <PopoverTrigger>
                        <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary underline-offset-4 hover:underline">
                          <Download size={24} className=" mr-2" />{" "}
                          {game?.downloadable
                            ? "Download Game"
                            : "Download Demo"}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className=" flex flex-col gap-6 p-4">
                          <Button
                            className=" flex flex-row justify-start text-center"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleGameDownload(game, "windows");
                            }}
                          >
                            <Windows className=" mr-2" />
                            Windows Downloader
                          </Button>
                          <Button
                            className=" flex flex-row justify-start text-center"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleGameDownload(game, "linux");
                            }}
                          >
                            <Linux className=" mr-2" />
                            Linux Downloader
                          </Button>
                          <Button
                            className=" flex flex-row justify-start text-center"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleGameDownload(game, "macos");
                            }}
                          >
                            <MacOS className=" mr-2" />
                            MacOS Downloader
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </>
  );
}
