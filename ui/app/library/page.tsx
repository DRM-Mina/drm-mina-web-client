"use client";
import { useWalletStore } from "@/lib/stores/walletStore";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React from "react";

const DynamicLibrary = dynamic(() => import("@/app/library/library"));

export default function Library() {
  const walletStore = useWalletStore();
  const router = useRouter();

  return (
    <div className=" p-8">
      {walletStore.isAuthenticated ? (
        <DynamicLibrary />
      ) : (
        <div className="flex h-[80vh] items-center justify-center">
          <h3 className="text-3xl font-medium">
            Please connect your wallet to view your library
          </h3>
        </div>
      )}
    </div>
  );
}
