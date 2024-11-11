"use client";
import { Label } from "@/components/ui/label";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWalletStore } from "@/lib/stores/walletStore";

const GameTokenDeploy = dynamic(() => import("./gameTokenDeploy"));
const SecondForm = dynamic(() => import("./secondForm"));

export default function Register() {
  const walletStore = useWalletStore();
  const [form, setForm] = useState("1");
  return (
    <div className=" h-full p-8">
      <div className=" flex h-full w-full justify-center">
        {walletStore.isConnected ? (
          <div className=" flex  h-full w-full flex-col gap-4 px-4">
            <div className=" py-4">
              <h1 className="text-3xl font-medium">Game Registration</h1>

              <h3 className="text-md py-4">How to Register Your Game?</h3>

              <p className="text-sm">
                1. Deploy your game with this form or manually as described in
                the{" "}
                <a
                  className="underline inline-block"
                  href="https://docs.drmmina.com/howitworks/registerGame"
                >
                  documentation
                </a>
                .
              </p>

              <p className="text-sm">
                2. After the deployment is successful, you can configure your
                offchain game informations with your wallet.
              </p>

              <p className="text-sm">
                3. Your game will be registered and you will be able to see it
                in the store.
              </p>
            </div>

            <RadioGroup
              defaultValue="1"
              onValueChange={(value: string) => {
                setForm(value);
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="r1" />
                <Label htmlFor="r1">GameToken Deployment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="r2" />
                <Label htmlFor="r2">Marketplace Register Form</Label>
              </div>
            </RadioGroup>

            {form === "1" ? <GameTokenDeploy /> : <SecondForm />}
          </div>
        ) : (
          <div className="flex h-[80vh] items-center justify-center">
            <h3 className="text-3xl font-medium">
              Please connect your wallet for game registration
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
