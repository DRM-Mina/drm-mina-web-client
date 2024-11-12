import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useWorkerStore } from "@/lib/stores/workerStore";

import React, { useState } from "react";
import ChangeOnChain from "./changeOnChain";

export default function GameTokenUpdate() {
  const workerStore = useWorkerStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [GameTokenAddr, setGameTokenAddr] = useState("");
  const [isGameTokenAddr, setIsGameTokenAddr] = useState(false);
  const [isGameTokenFields, setIsGameTokenFields] = useState(false);
  const [GameTokenFields, setGameTokenFields] = useState({
    publisher: "",
    price: 0,
    discount: 0,
    timeoutInterval: 0,
    numberOfDevices: 0,
  });

  const { toast } = useToast();

  const handleToast = (msg: string) => {
    toast({
      title: msg,
    });
  };

  const fetchContract = async () => {
    if (RegExp(/^B62[1-9A-HJ-NP-Za-km-z]{52}$/).test(GameTokenAddr)) {
      setIsGameTokenAddr(true);
    }

    if (!isGameTokenAddr) {
      handleToast("Invalid GameToken Address");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await workerStore.fetchGameTokenFields(GameTokenAddr);
      console.log(result);
      setGameTokenFields(result);
      setIsGameTokenFields(true);
      setIsProcessing(false);
    } catch (error) {
      handleToast("Error fetching contract");
    }
  };

  return (
    <>
      <div className=" flex flex-row gap-4 items-end">
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="address">GameToken Address</Label>
          <Input
            onChange={(event) => {
              setGameTokenAddr(event.target.value);
            }}
            value={GameTokenAddr}
            id="address"
          />
        </div>

        <Button disabled={isProcessing} onClick={fetchContract}>
          {isProcessing ? "Processing" : "Fetch Contract"}
        </Button>
      </div>

      {isGameTokenFields && (
        <ChangeOnChain
          GameTokenAddr={GameTokenAddr}
          GameTokenFields={GameTokenFields}
          setGameTokenFields={setGameTokenFields}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />
      )}
    </>
  );
}
