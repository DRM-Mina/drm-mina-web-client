import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useWalletStore } from "@/lib/stores/walletStore";
import { Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

const Web3walletPopover = dynamic(() => import("./web3walletPopover"));

export default function Web3wallet() {
    const walletStore = useWalletStore();
    const { toast } = useToast();

    const handleConnectWallet = async () => {
        // if (!walletStore.walletInstalled) {
        //     toast({
        //         description: "Please install a Mina wallet",
        //     });
        //     return;
        // }
        const res = await walletStore.connect();
        if (!res) {
            toast({
                title: "Error",
                description: "Failed to connect wallet",
            });
        }
    };
    return (
        <div>
            {walletStore.isConnected ? (
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
