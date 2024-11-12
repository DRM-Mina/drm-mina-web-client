import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useHasMounted from "@/lib/customHooks";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";

import { Check, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

interface BuyGameProps {
  game: Game | undefined;
}

export default function BuyGame({ game }: BuyGameProps) {
  const workerStore = useWorkerStore();
  const walletStore = useWalletStore();
  const userStore = useUserStore();

  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  const hasMounted = useHasMounted();

  useEffect(() => {
    if (workerStore.gameTokenCompiled) {
      setIsReady(true);
    }
  }, [hasMounted, workerStore.gameTokenCompiled]);

  const handleGameBuy = async () => {
    let transactionFee = 0.1;

    if (!walletStore.userPublicKey) {
      toast({
        title: "Please connect your wallet",
        description: "Please connect your wallet to buy the game",
      });
      return;
    }
    if (
      workerStore.isReady &&
      walletStore.userPublicKey &&
      game &&
      workerStore.gameTokenCompiled
    ) {
      try {
        setIsReady(false);
        const transactionJSON = await workerStore.buyGame(
          walletStore.userPublicKey,
          game?.gameTokenContractAddress
        );

        console.log("Getting transaction JSON...");
        const { hash } = await (window as any).mina.sendTransaction({
          transaction: transactionJSON,
          feePayer: {
            fee: transactionFee,
            memo: "",
          },
        });
        setIsReady(true);

        const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
        toast({
          title: "Transaction sent",
          description: `${transactionLink}`,
        });
      } catch (error) {
        setIsReady(true);
        console.error("Error buying game: ", error);
        toast({
          title: "Error buying game",
          description:
            "There was an error buying the game, please try again later",
        });
      }
    } else {
      toast({
        title: "Web workers not ready",
        description: "Web workers are not ready yet, please try again later",
      });
    }
  };

  return !userStore.library.includes(game?.gameId || -1) ? (
    <Button
      variant={"default"}
      onClick={(event) => {
        event.stopPropagation();
        handleGameBuy();
      }}
      disabled={!isReady}
    >
      {!isReady ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        "Buy Game"
      )}
    </Button>
  ) : (
    <div className=" flex flex-row items-center text-green-700">
      <Check /> <span>Owned</span>
    </div>
  );
}
