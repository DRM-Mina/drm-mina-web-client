import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/lib/stores/walletStore";
import { Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

const Web3walletPopover = dynamic(() => import("./web3walletPopover"));

export default function Web3wallet() {
    const walletStore = useWalletStore();

    return (
        <div>
            {walletStore.isConnected ? (
                <Web3walletPopover />
            ) : (
                <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => walletStore.connect()}
                >
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                </Button>
            )}
        </div>
    );
}
