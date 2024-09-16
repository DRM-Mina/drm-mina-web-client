import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import React from "react";

export default function Web3walletPopover() {
    const walletStore = useWalletStore();
    const userStore = useUserStore();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50  w-full cursor-pointer">
                    <span className=" truncate">{walletStore.userPublicKey}</span>
                </div>
            </PopoverTrigger>
            <PopoverContent className=" ml-2 w-auto">
                <h4 className="w-full text-wrap px-4 text-sm font-normal tracking-tight">
                    {walletStore.userPublicKey}
                </h4>
                <p className=" w-full text-wrap px-4 pt-2 text-xs font-normal tracking-tight">
                    Todo MINA
                </p>
                <p className=" w-full text-wrap px-4 pt-2 text-xs font-normal tracking-tight">
                    {userStore.library.length} Games
                </p>
                <div
                    className="hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                    onClick={() => walletStore.disconnect()}
                >
                    Disconnect
                </div>
            </PopoverContent>
        </Popover>
    );
}
