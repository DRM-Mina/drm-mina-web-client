import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
import { PublicKey, UInt64 } from "o1js";
import { useCallback, useEffect } from "react";
// import { useChainStore } from "./chain";
import { useTransactionStore } from "./transactionStore";
import { useUserStore } from "./userWallet";

export interface BalancesState {
  loading: boolean;
  balances: {
    // address - balance
    [key: string]: string;
  };
  loadBalance: (client: Client, address: string) => Promise<void>;
  faucet: (client: Client, address: string) => Promise<PendingTransaction>;
}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const tokenId = TokenId.from(0);

export const useBalancesStore = create<
  BalancesState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    balances: {},
    async loadBalance(client: Client, address: string) {
      set((state) => {
        state.loading = true;
      });

      const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));

      const balance = await client.query.runtime.Balances.balances.get(key);

      set((state) => {
        state.loading = false;
        state.balances[address] = balance?.toString() ?? "0";
      });
    },
    async faucet(client: Client, address: string) {
      const balances = client.runtime.resolve("Balances");
      const sender = PublicKey.fromBase58(address);

      const tx = await client.transaction(sender, () => {
        balances.addBalance(tokenId, sender, Balance.from(UInt64.from(1000)));
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useObserveBalance = () => {
  const client = useClientStore();
  // const chain = useChainStore();
  const wallet = useUserStore();
  const balances = useBalancesStore();
  const transactions = useTransactionStore();

  useEffect(() => {
    if (!client.client || !wallet.isConnected) return;

    balances.loadBalance(client.client, wallet.userPublicKey || "");
  }, [client.client, transactions, wallet.userPublicKey || ""]);
};

export const useFaucet = () => {
  const client = useClientStore();
  const balances = useBalancesStore();
  const wallet = useUserStore();
  const transactions = useTransactionStore();

  return useCallback(async () => {
    if (!client.client || !wallet.isConnected) return;

    const pendingTransaction = await balances.faucet(
      client.client,
      wallet.userPublicKey || "",
    );

    transactions.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.userPublicKey || ""]);
};
