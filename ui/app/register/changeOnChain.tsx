import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useWorkerStore } from "@/lib/stores/workerStore";
import React from "react";

export default function ChangeOnChain({
  GameTokenAddr,
  GameTokenFields,
  setGameTokenFields,
  isProcessing,
  setIsProcessing,
}: {
  GameTokenAddr: string;
  GameTokenFields: {
    publisher: string;
    price: number;
    discount: number;
    timeoutInterval: number;
    numberOfDevices: number;
  };
  setGameTokenFields: React.Dispatch<
    React.SetStateAction<{
      publisher: string;
      price: number;
      discount: number;
      timeoutInterval: number;
      numberOfDevices: number;
    }>
  >;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const workerStore = useWorkerStore();
  const { toast } = useToast();
  const handleToast = (msg: string) => {
    toast({
      title: msg,
    });
  };

  const handleUpdateContract = async () => {
    setIsProcessing(true);

    try {
      const transactionJSON = await workerStore.setGameTokenFields(
        GameTokenAddr,
        GameTokenFields.publisher,
        GameTokenFields.price,
        GameTokenFields.discount,
        GameTokenFields.timeoutInterval,
        GameTokenFields.numberOfDevices
      );

      const { hash } = await (window as any).mina.sendTransaction({
        transaction: transactionJSON,
        feePayer: {
          fee: 1e8,
          memo: "",
        },
      });
      const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
      setIsProcessing(false);
      toast({
        title: "Contract updated",
        description: `${transactionLink}`,
      });
    } catch (error) {
      setIsProcessing(false);
      handleToast("Error updating contract");
    }
  };

  return (
    <>
      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="price">Price</Label>
          <Input
            disabled={isProcessing}
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 0) {
                value = 0;
              }
              setGameTokenFields((prev) => ({ ...prev, price: value }));
            }}
            value={GameTokenFields.price}
            defaultValue={0}
            type="number"
            id="price"
          />
        </div>
      </div>

      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="discount">{"Discount Amount"}</Label>
          <Input
            disabled={isProcessing}
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 0) {
                value = 0;
              }
              setGameTokenFields((prev) => ({ ...prev, discount: value }));
            }}
            value={GameTokenFields.discount}
            defaultValue={0}
            type="number"
            id="discount"
          />
        </div>
      </div>

      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="timeoutInterval">
            {"Timeout Interval (120 minutes minimum)"}
          </Label>
          <Input
            disabled={isProcessing}
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 120) {
                value = 120;
              }
              setGameTokenFields((prev) => ({
                ...prev,
                timeoutInterval: value,
              }));
            }}
            value={GameTokenFields.timeoutInterval}
            defaultValue={120}
            type="number"
            id="timeoutInterval"
          />
        </div>
      </div>

      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label>Number of Devices Allowed</Label>
          <Select
            disabled={isProcessing}
            defaultValue={GameTokenFields.numberOfDevices.toString()}
            onValueChange={(value) => {
              setGameTokenFields((prev) => ({
                ...prev,
                numberOfDevices: parseInt(value),
              }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Number of Devices" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="w-[180px]">
        <Button disabled={isProcessing} onClick={handleUpdateContract}>
          {isProcessing ? "Processing" : "Update Contract"}
        </Button>
      </div>
    </>
  );
}
