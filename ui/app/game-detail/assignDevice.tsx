import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { postSlotNames } from "@/lib/api";
import { useDeviceStore } from "@/lib/stores/deviceStore";
import { useObserveSlots, useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";
import React, { useEffect, useState } from "react";

export default function AssignDevice({ game }: { game: Game }) {
  const userStore = useUserStore();
  const walletStore = useWalletStore();
  const deviceStore = useDeviceStore();
  const workerStore = useWorkerStore();

  const [slotNames, setSlotNames] = useState<string[]>([]);

  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    setSlotNames(userStore.slotNames);
  }, [userStore.slotNames, walletStore.userPublicKey]);

  const { canAssign, fetchingDevices } = useObserveSlots(game);

  const handlePostSlotNames = async () => {
    const res = await postSlotNames(
      walletStore.userPublicKey!,
      game.gameId,
      slotNames
    );
    if (res) {
      toast({
        description: "Slot names updated",
      });
    } else {
      toast({
        description: "Failed to update slot names",
      });
    }
  };

  const handleAssignDevice = async (index: number) => {
    if (!deviceStore.isDeviceSet) {
      toast({
        title: "No device information provided",
        description: "Please try to connect through the our desktop app",
      });
      return;
    }

    if (!workerStore.isReady) {
      toast({
        title: "Web workers not ready",
        description: "Please wait for the web workers to get ready",
      });
      return;
    }

    if (!walletStore.userPublicKey || !game) return;

    if (isAssigning) {
      toast({
        title: "Still assigning",
        description: "Please wait for the previous assignment to complete",
      });
      return;
    }

    setIsAssigning(true);
    try {
      console.log("Assigning device to slot", index);
      const transactionJSON = await workerStore.assignDeviceToSlot(
        walletStore.userPublicKey,
        deviceStore.device,
        index + 1,
        game.DRMContractAddress
      );

      const { hash } = await (window as any).mina.sendTransaction({
        transaction: transactionJSON,
        feePayer: {
          fee: 0.1,
          memo: "",
        },
      });
      setIsAssigning(false);
      const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
      toast({
        title: "Transaction sent",
        description: `Transaction sent, check it out at ${transactionLink}`,
      });
    } catch (error) {
      console.error("Error assigning device to slot", error);
      setIsAssigning(false);
      toast({
        title: "Error assigning device to slot",
        description:
          "There was an error assigning the device to the slot, please try again later",
      });
    }
  };

  return (
    <div className=" col-span-3 h-full">
      {canAssign && game && userStore.library.includes(game.gameId) && (
        <div className=" grid h-full w-full grid-cols-4 p-4">
          {userStore.slotNames.map((_, index) => {
            return (
              <div
                key={index}
                className=" col-span-1 grid h-full grid-rows-2 items-center justify-center px-4"
              >
                <Input
                  className=" row-span-1 "
                  type="text"
                  value={slotNames[index] || ""}
                  placeholder="Give a name"
                  onChange={(event) => {
                    const newSlotNames = [...slotNames];
                    newSlotNames[index] = event.target.value;
                    setSlotNames(newSlotNames);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handlePostSlotNames();
                    }
                  }}
                ></Input>
                <div className=" row-span-1 flex w-full flex-col items-center justify-center gap-2">
                  <h3 className=" text-center">{userStore.slots[index]}</h3>
                  <Button
                    key={index}
                    variant={"secondary"}
                    disabled={isAssigning}
                    onClick={() => handleAssignDevice(index)}
                  >
                    {isAssigning ? "Assigning" : "Assign This"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!canAssign && game && userStore.library.includes(game.gameId) && (
        <div className="grid col-span-3 h-full place-items-center">
          <div className=" flex gap-1 flex-col justify-center items-center">
            <div>Waiting Compilation</div>
            <div className="ping-pong"></div>
          </div>
        </div>
      )}
    </div>
  );
}
