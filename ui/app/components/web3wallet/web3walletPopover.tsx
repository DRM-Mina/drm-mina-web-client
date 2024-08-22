import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useUserStore } from "@/lib/stores/userWallet";
import React from "react";

export default function Web3walletPopover() {
    const userWallet = useUserStore();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="flex w-full justify-start px-2 ">
                    {/* <Wallet className="mr-2 h-4 w-4" /> */}
                    <span className="ml-4 truncate">{userWallet.userPublicKey}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className=" ml-2 w-auto">
                <h4 className="w-full text-wrap px-4 text-sm font-normal tracking-tight">
                    {userWallet.userPublicKey}
                </h4>
                <p className=" w-full text-wrap px-4 pt-2 text-xs font-normal tracking-tight">
                    Todo MINA
                </p>
                <p className=" w-full text-wrap px-4 pt-2 text-xs font-normal tracking-tight">
                    {userWallet.library.length} Games
                </p>
                <Button className=" mt-2" variant="ghost" onClick={() => userWallet.disconnect()}>
                    Disconnect
                </Button>
            </PopoverContent>
        </Popover>
    );
}
