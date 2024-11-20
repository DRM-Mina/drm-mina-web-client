import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { authenticateUser } from "@/lib/api";
import { useWalletStore } from "@/lib/stores/walletStore";
import { Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useEffect } from "react";

const Web3walletPopover = dynamic(() => import("./web3walletPopover"));

export default function Web3wallet() {
  const walletStore = useWalletStore();
  const { toast } = useToast();

  const handleConnectWallet = async () => {
    const res = await walletStore.connect();
    if (res === 0) {
      toast({
        title: "Auro wallet not found",
        description: "Please install Auro wallet",
      });
      return;
    }
    if (res === 2) {
      toast({
        title: "Error",
        description: "Failed to connect wallet",
      });
      return;
    }
  };

  useEffect(() => {
    if (
      walletStore.userPublicKey &&
      !walletStore.isAuthenticated &&
      walletStore.isConnected
    ) {
      (async () => {
        // @ts-ignore
        const token = await authenticateUser(walletStore.userPublicKey);
        if (!token) {
          toast({
            title: "Error",
            description: "Failed to authenticate user",
          });
          walletStore.disconnect();
        } else {
          walletStore.setIsAuthenticated(true);
        }
      })();
    }
  }, [walletStore.userPublicKey]);
  return (
    <div>
      {walletStore.isAuthenticated ? (
        <Web3walletPopover />
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleConnectWallet}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
