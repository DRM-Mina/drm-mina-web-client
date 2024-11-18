"use client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Windows from "./windows";
import Linux from "./linux";
import MacOS from "./macos";
import Unity from "./unity";
import { getSignedFileDownloadUrl } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useWalletStore } from "@/lib/stores/walletStore";

export default function Downloads() {
  const { toast } = useToast();
  const walletStore = useWalletStore();
  const handleDownload = async (filename: string) => {
    if (!walletStore.isAuthenticated) {
      return toast({
        title: "Please connect your wallet",
        description: "You need to connect your wallet to download",
      });
    }
    try {
      const url = await getSignedFileDownloadUrl(filename);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
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
  };
  return (
    <div className=" h-full p-8">
      <div className=" flex h-full w-full justify-center">
        <div className=" flex  h-full w-full flex-col gap-4 px-4">
          <div className=" py-4">
            <div>
              <h1 className="text-3xl text-center font-medium">
                Download Section
              </h1>

              <p className=" py-4 text-center">
                Downloadables of DRM Mina such as Desktop Client and DRM Mina
                Unity Package
              </p>
            </div>
            <div className=" grid grid-cols-5">
              <div className=" col-span-2">
                <h2 className="text-2xl font-medium">Desktop Client</h2>
                <p className="text-sm py-2">
                  Download the latest version of the DRM Mina Desktop Client
                </p>
                <Separator className=" border-1" />
                <div className=" flex flex-row justify-between py-2">
                  <p className="flex">Windows Client</p>
                  <Button
                    className="items-left row-span-1 mt-2 justify-start pl-1"
                    onClick={() =>
                      handleDownload("DRM Mina Desktop Client.exe")
                    }
                  >
                    <Windows /> &nbsp; Download{" "}
                  </Button>
                </div>
                <div className=" flex flex-row justify-between py-2">
                  <p className="flex">Linux Client</p>
                  <Button
                    className="items-left row-span-1 mt-2 justify-start pl-1"
                    onClick={() =>
                      handleDownload("DRM Mina Desktop Client.AppImage")
                    }
                  >
                    <Linux /> &nbsp; Download{" "}
                  </Button>
                </div>

                <div className=" flex flex-row justify-between py-2 items-center">
                  <p className="flex ">MacOS Client</p>
                  <Button
                    className="items-left row-span-1 mt-2 justify-start pl-1"
                    onClick={() =>
                      handleDownload("DRM Mina Desktop Client.dmg")
                    }
                  >
                    <MacOS /> &nbsp; Download{" "}
                  </Button>
                </div>
              </div>
              <div className=" col-span-1"></div>
              <div className=" col-span-2">
                <h2 className="text-2xl font-medium">Unity Package</h2>
                <p className="text-sm py-2">
                  Download the latest version of the DRM Mina Unity Package
                </p>
                <Separator />

                <div className=" flex flex-row justify-between py-2 items-center">
                  <p className="flex">Unity Package</p>
                  <Button
                    className="items-left row-span-1 mt-2 justify-start pl-1"
                    onClick={() => handleDownload("DRM Mina.unitypackage.zip")}
                  >
                    <Unity /> &nbsp; Download{" "}
                  </Button>
                </div>
              </div>
            </div>
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
