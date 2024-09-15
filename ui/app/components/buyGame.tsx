import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useHasMounted from "@/lib/customHooks";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";

import { Check } from "lucide-react";
import React, { useEffect } from "react";

interface BuyGameProps {
    gameId: number | undefined;
}

export default function BuyGame({ gameId }: BuyGameProps) {
    const workerStore = useWorkerStore();
    const walletStore = useWalletStore();
    const userStore = useUserStore();

    const { toast } = useToast();

    const hasMounted = useHasMounted();
    useEffect(() => {
        if (hasMounted && !workerStore.isReady) {
            toast({
                title: "Web workers loading",
                description:
                    "Our web workers working hard to getting ready things up, computer's fans could speed up a little 😬",
            });
            (async () => {
                if (workerStore.isLoading || workerStore.isReady) {
                    return;
                }

                await workerStore.startWorker();

                toast({
                    title: "Web workers loaded",
                    description: "Web workers are ready",
                });
            })();
        }
    }, [hasMounted]);

    const handleGameBuy = async () => {
        let transactionFee = 0.1;

        if (workerStore.isReady && walletStore.userPublicKey) {
            await workerStore.worker?.buyGame({ recipient: walletStore.userPublicKey });

            console.log("Creating proof...");
            await workerStore.worker?.proveUpdateTransaction();

            console.log("Requesting send transaction...");
            const transactionJSON = await workerStore.worker?.getTransactionJSON();

            console.log("Getting transaction JSON...");
            const { hash } = await (window as any).mina.sendTransaction({
                transaction: transactionJSON,
                feePayer: {
                    fee: transactionFee,
                    memo: "",
                },
            });

            const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
            console.log(`View transaction at ${transactionLink}`);
        } else {
            toast({
                title: "Web workers not ready",
                description: "Web workers are not ready yet, please try again later",
            });
        }
    };

    return !userStore.library.includes(gameId || -1) ? (
        <Button
            variant={"default"}
            onClick={(event) => {
                event.stopPropagation();
                handleGameBuy();
            }}
        >
            Buy Game
        </Button>
    ) : (
        <div className=" flex flex-row items-center text-green-700">
            <Check /> <span>Owned</span>
        </div>
    );
}
