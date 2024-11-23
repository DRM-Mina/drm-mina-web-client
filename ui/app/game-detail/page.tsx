"use client";
import React, { Suspense, useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ChevronLeft, Download, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useGamesStore } from "@/lib/stores/gameStore";
import { useDeviceStore } from "@/lib/stores/deviceStore";
import { useToast } from "@/components/ui/use-toast";
import dynamic from "next/dynamic";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CommentSection from "./commentSection";
import RatingDisplay from "./ratingDisplay";
import { getSignedGameDownloadUrl } from "@/lib/api";
import { useWalletStore } from "@/lib/stores/walletStore";
import Linux from "../downloads/linux";
import MacOS from "../downloads/macos";
import Windows from "../downloads/windows";

const ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

const BuyGame = dynamic(() => import("../components/buyGame"), {
  loading: () => <Button>Loading...</Button>,
});

// const GiftGame = dynamic(() => import("../components/giftGame"), {
//     loading: () => <Gift className=" p-4" />,
// });

const AssignDevice = dynamic(() => import("./assignDevice"));

function Detail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [gameName, setGameName] = useState<string | null>(null);
  // const [device, setDevice] = useState<string | null>(null);
  const gameStore = useGamesStore();
  const deviceStore = useDeviceStore();
  const walletStore = useWalletStore();
  const { toast } = useToast();

  useEffect(() => {
    const gameParam = searchParams.get("game");
    const deviceParam = searchParams.get("device");

    if (gameParam) {
      setGameName(gameParam);
    }
    // if (deviceParam) {
    //     setDevice(deviceParam);
    //     console.log("device set");
    // }

    if (deviceParam) {
      if (!deviceStore.isDeviceSet) {
        try {
          const decodedDevice = decodeURIComponent(deviceParam);
          const deviceObj = JSON.parse(decodedDevice);
          console.log(deviceObj);
          deviceStore.setDevice(deviceObj);
          if (gameParam) {
            router.push(`/game-detail?game=${encodeURIComponent(gameParam)}`);
          }
        } catch (error) {
          console.error("Failed to parse device parameter:", error);
        }
      }
      if (deviceStore.isDeviceSet) {
        toast({
          title: "Device set",
          description:
            "We got your device information 🕵️, just kidding your information is only yours ✨",
        });
      }
    }
  }, [searchParams, deviceStore, router]);

  const game = gameStore.games.find((game) => game.name === gameName);
  const imageCount = game?.imageCount || 1;

  const handleGameDownload = async (platfom: string) => {
    if (!game) {
      return;
    }
    if (!walletStore.isAuthenticated) {
      return toast({
        title: "Please connect your wallet",
        description: "You need to connect your wallet to download",
      });
    }
    try {
      const url = await getSignedGameDownloadUrl(game, platfom);

      const link = document.createElement("a");
      link.href = url;
      link.download = game.imageFolder;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description:
          "Your download has started, check your browser's download section",
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
    <div>
      <div className=" grid w-full grid-cols-5 p-4">
        <div className=" col-span-3 mt-8 h-full">
          <Button
            variant={"outline"}
            onClick={() => router.replace("/store")}
            className=" ml-4"
          >
            <ChevronLeft size={24} /> Back to Store
          </Button>
          <Carousel
            plugins={[
              Autoplay({
                delay: 5000,
              }),
            ]}
            opts={{
              align: "start",
            }}
            className="w-full justify-center p-4"
          >
            <CarouselContent>
              {Array.from({ length: imageCount }).map((_, i) => (
                <CarouselItem key={i}>
                  <img
                    src={
                      imageCount > 1
                        ? ENDPOINT! +
                          "images/" +
                          game?.imageFolder +
                          "/40/" +
                          game?.imageFolder +
                          "_ingame_" +
                          (i + 1) +
                          ".webp"
                        : ENDPOINT! + "images/default/40/default.webp"
                    }
                    crossOrigin="anonymous"
                    alt="Game"
                    className="aspect-video h-full w-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
        <div className=" col-span-2 h-full px-4">
          <div className=" mt-8 flex h-full flex-col items-center justify-between p-8">
            <div className="w-full ">
              <h1 className=" self-center p-4 text-3xl font-bold">
                {game?.name}
              </h1>
              <Separator />
              <h3 className=" self text-md p-3 font-normal">
                <span className="text-lg font-normal text-gray-700">
                  {"Publisher: "}
                </span>
                {game?.creator}
              </h3>
            </div>
            <div className=" mt-8 text-base">{game?.description}</div>

            <div className=" flex flex-col items-center justify-center">
              <RatingDisplay
                rating={game?.averageRating || 0}
                decimals={true}
              />
              <div className=" flex items-center text-sm">
                Total Reviews: {game?.ratingCount}
              </div>
            </div>

            <div>
              {Array.from(game?.tags || []).map((tag, index) => (
                <Badge key={index} className=" mx-1 rounded-lg">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 ">
              <div className=" mt-8 flex flex-row gap-4 rounded-lg border border-gray-300 p-2">
                <div className=" flex items-center justify-center gap-1 ">
                  {game?.discount || 0 > 0 ? (
                    <>
                      <div className=" text-discount bg-discount rounded-lg p-1 text-lg">
                        -%
                        {Math.floor(
                          ((game?.discount || 0) / (game?.price || 1)) * 100
                        )}
                      </div>
                      <span className="strikethrough px-2 text-base text-gray-500">
                        {game?.price}
                      </span>
                    </>
                  ) : (
                    <></>
                  )}
                  <span className="text-base">
                    {game?.price! - game?.discount! || "Loading..."}
                  </span>
                  <img
                    src={"/mina.webp"}
                    alt="mina"
                    className=" inline-block h-4 w-4"
                  />
                </div>
                <BuyGame game={game} />
                {/* <GiftGame gameId={game?.gameId} /> */}
              </div>
              <Popover>
                <PopoverTrigger>
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary underline-offset-4 hover:underline">
                    <Download size={24} className=" mr-2" />{" "}
                    {game?.downloadable ? "Download Game" : "Download Demo"}
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <div className=" flex flex-col gap-6 p-4">
                    <Button
                      className=" flex flex-row justify-start text-center"
                      onClick={() => {
                        handleGameDownload("windows");
                      }}
                    >
                      <Windows className=" mr-2" />
                      Windows Downloader
                    </Button>
                    <Button
                      className=" flex flex-row justify-start text-center"
                      onClick={() => {
                        handleGameDownload("linux");
                      }}
                    >
                      <Linux className=" mr-2" />
                      Linux Downloader
                    </Button>
                    <Button
                      className=" flex flex-row justify-start text-center"
                      onClick={() => {
                        handleGameDownload("macos");
                      }}
                    >
                      <MacOS className=" mr-2" />
                      MacOS Downloader
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
      <div className=" grid grid-cols-6">
        <div className=" col-span-2 p-8 overflow-hidden">
          <h3 className=" font-semibold">Contract Adresses</h3>
          <Separator />
          <div className=" mt-4 gap-2 flex flex-col text-sm">
            <div>
              <span className=" font-semibold">
                Game Token Contract Address:{" "}
              </span>
              <a
                href={`https://minascan.io/devnet/account/${game?.gameTokenContractAddress}`}
                target="_blank"
                rel="noreferrer"
                className=" text-sm font-normal underline underline-offset-4"
              >
                {game?.gameTokenContractAddress}
              </a>
            </div>
            <div>
              <span className=" font-semibold">DRM Contract Address: </span>
              <a
                href={`https://minascan.io/devnet/account/${game?.DRMContractAddress}`}
                target="_blank"
                rel="noreferrer"
                className=" text-sm font-normal underline underline-offset-4"
              >
                {game?.DRMContractAddress}
              </a>
            </div>
          </div>
        </div>
        <div className=" col-span-1"></div>
        <div className=" col-span-3">
          <AssignDevice game={game!} />
        </div>
      </div>
      {game && <CommentSection game={game} />}
    </div>
  );
}

export default function GameDetail() {
  return (
    <Suspense fallback={<div>Loading game...</div>}>
      <Detail />
    </Suspense>
  );
}
