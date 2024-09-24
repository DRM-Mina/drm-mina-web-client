import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { postSlotNames } from "@/lib/api";
import useHasMounted from "@/lib/customHooks";
import { useDeviceStore } from "@/lib/stores/deviceStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";
import React, { useEffect, useState } from "react";

interface AssignDeviceProps {
    game: Game;
}

export default function AssignDevice({ game }: AssignDeviceProps) {
    const userStore = useUserStore();
    const walletStore = useWalletStore();
    const deviceStore = useDeviceStore();
    const workerStore = useWorkerStore();
    const [slotNames, setSlotNames] = useState<string[]>([]);
    const [canAssign, setCanAssign] = useState<boolean>(false);
    const [isAssigning, setIsAssigning] = useState<boolean>(false);
    const [fetchingDevices, setFetchingDevices] = useState<boolean>(false);

    const { toast } = useToast();

    useEffect(() => {
        setSlotNames(userStore.slotNames);
    }, [userStore.slotNames, walletStore.userPublicKey]);

    useEffect(() => {
        console.log(
            workerStore.isReady,
            workerStore.gameTokenCompiled,
            walletStore.isConnected,
            userStore.library.includes(game.gameId),
            // userStore.gameId === game.gameId,
            !fetchingDevices
        );
        if (
            // TODO: enable in prod
            // deviceStore.isDeviceSet &&
            workerStore.isReady &&
            workerStore.gameTokenCompiled &&
            walletStore.isConnected &&
            userStore.library.includes(game.gameId) &&
            // userStore.gameId === game.gameId &&
            !fetchingDevices
        ) {
            (async () => {
                setFetchingDevices(true);
                const slotCount = await workerStore.getMaxDeviceAllowed(
                    game.gameTokenContractAddress
                );
                console.log("slotCount", slotCount);
                const devices = await workerStore.getDevices(
                    walletStore.userPublicKey!,
                    game.DRMContractAddress
                );
                console.log(devices);
                let slotArray: string[] = [];
                if (devices) {
                    for (let i = 1; i <= slotCount; i++) {
                        slotArray.push(
                            devices[i] === "0" ? "Empty" : devices[i].slice(0, 6) + "..."
                        );
                    }
                } else {
                    for (let i = 0; i < slotCount; i++) {
                        slotArray.push("Empty");
                    }
                }
                setFetchingDevices(false);
                if (devices) {
                    setCanAssign(true);
                }
            })();
        }
    }, [
        walletStore.isConnected,
        userStore.library,
        userStore.gameId,
        workerStore.isReady,
        workerStore.gameTokenCompiled,
    ]);

    return (
        <div className=" col-span-3">
            {canAssign ? (
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
                                            (async () => {
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
                                            })();
                                        }
                                    }}
                                ></Input>
                                <div className=" row-span-1 flex w-full flex-col items-center justify-center gap-2">
                                    <h3 className=" text-center">{userStore.slots[index]}</h3>
                                    <Button
                                        key={index + 1}
                                        variant={"secondary"}
                                        disabled={isAssigning}
                                        onClick={() => {
                                            console.log("Assigning");
                                        }}
                                    >
                                        {isAssigning ? "Assigning" : "Assign This"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <></>
            )}
        </div>
    );
}
