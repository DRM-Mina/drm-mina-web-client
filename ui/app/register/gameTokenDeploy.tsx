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
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";

import React, { useEffect, useState } from "react";

export default function GameTokenDeploy() {
  //   const [registerFee, setRegisterFee] = useState(0);
  const workerStore = useWorkerStore();
  const walletStore = useWalletStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState({
    symbol: "",
    price: 0,
    discount: 0,
    timeoutInterval: 120,
    numberOfDevices: 1,
  });

  const [result, setResult] = useState<{
    GameTokenAddr: string;
    GameTokenPk: string;
    DRMAddr: string;
    DRMPk: string;
    transaction: string;
  } | null>(null);

  const { toast } = useToast();

  const handleToast = (msg: string) => {
    toast({
      title: msg,
    });
  };

  const handleSubmit = async () => {
    if (form.price < 0) {
      handleToast("Price cannot be negative");
      return;
    }

    if (form.discount < 0) {
      handleToast("Discount cannot be negative");
      return;
    }

    if (form.timeoutInterval < 120) {
      handleToast("Timeout interval cannot be less than 120 minutes");
      return;
    }

    if (form.numberOfDevices < 1) {
      handleToast("Number of devices cannot be less than 2");
      return;
    }

    if (RegExp(/^[a-zA-Z]+$/).test(form.symbol) === false) {
      handleToast("Symbol must contain only alphabets");
      return;
    }

    if (workerStore.isReady === false) {
      handleToast("Worker is not ready");
      return;
    }

    try {
      setIsProcessing(true);
      const { GameTokenAddr, GameTokenPk, DRMAddr, DRMPk, transaction } =
        await workerStore.deployGameToken(
          walletStore.userPublicKey!,
          form.symbol,
          form.price,
          form.discount,
          form.timeoutInterval,
          form.numberOfDevices
        );
      const { hash } = await (window as any).mina.sendTransaction({
        transaction: transaction,
        feePayer: {
          fee: 0.1,
          memo: "",
        },
      });
      setResult({
        GameTokenAddr,
        GameTokenPk,
        DRMAddr,
        DRMPk,
        transaction: `https://minascan.io/devnet/tx/${hash}`,
      });
      setIsProcessing(false);
    } catch (e) {
      handleToast("Failed to deploy game token");
      console.error(e);
    }
  };

  return (
    <>
      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            onChange={(event) => {
              setForm((prev) => ({ ...prev, symbol: event.target.value }));
            }}
            value={form.symbol}
            id="symbol"
          />
        </div>
      </div>

      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="price">Price</Label>
          <Input
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 0) {
                value = 0;
              }
              setForm((prev) => ({ ...prev, price: value }));
            }}
            value={form.price}
            defaultValue={0}
            type="number"
            id="price"
          />
        </div>
      </div>

      <div>
        <div className="grid w-full max-w-xs items-center gap-1.5">
          <Label htmlFor="discount">{"Discount Amount (Optional)"}</Label>
          <Input
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 0) {
                value = 0;
              }
              setForm((prev) => ({ ...prev, discount: value }));
            }}
            value={form.discount}
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
            onChange={(event) => {
              let value = parseInt(event.target.value);
              if (value < 120) {
                value = 120;
              }
              setForm((prev) => ({ ...prev, timeoutInterval: value }));
            }}
            value={form.timeoutInterval}
            defaultValue={120}
            type="number"
            id="timeoutInterval"
          />
        </div>
      </div>

      <div>
        <Label>Number of Devices Allowed</Label>
        <Select
          defaultValue="1"
          onValueChange={(value) => {
            setForm((prev) => ({ ...prev, numberOfDevices: parseInt(value) }));
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

      {/* <div>
        <p className="text-md justify-center py-4">
          {registerFee + " "}
          <img
            src={"/mina.webp"}
            alt="mina"
            className=" inline-block h-4 w-4 "
          />
          {" will be charged for registration. Can not be refunded."}
        </p>
      </div> */}

      <div className="w-[180px]">
        <Button
          className=" w-full"
          onClick={handleSubmit}
          disabled={
            isProcessing || !walletStore.isConnected || !workerStore.drmCompiled
          }
        >
          {isProcessing || !walletStore.isConnected || !workerStore.drmCompiled
            ? "Loading..."
            : "Deploy Game Token"}
        </Button>
      </div>

      {result && (
        <div className="py-4">
          <h3 className="text-md">
            Deployment sent, please save this informations:
          </h3>

          <p>Game Token Address: {result.GameTokenAddr}</p>
          <p>Game Token Private Key: {result.GameTokenPk}</p>
          <p>DRM Address: {result.DRMAddr}</p>
          <p>DRM Private Key: {result.DRMPk}</p>
          <p>
            Transaction Link:{" "}
            <a
              className=" underline inline-block"
              href={result.transaction}
              target="_blank"
              rel="noreferrer"
            >
              {result.transaction}
            </a>
          </p>
        </div>
      )}
    </>
  );
}
