"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useDeviceStore } from "@/lib/stores/deviceStore";
import Store from "@/app/store/page";
import { useObserveGames } from "@/lib/stores/gameStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useWorkerStore } from "@/lib/stores/workerStore";
import { useToast } from "@/components/ui/use-toast";
import useHasMounted from "@/lib/customHooks";
import { useObserveUserLibrary } from "@/lib/stores/userStore";

export default function Home() {
    const gameName = useSearchParams()?.get("game");
    const device = useSearchParams()?.get("device");
    const workerStore = useWorkerStore();
    const router = useRouter();
    const deviceStore = useDeviceStore();
    const walletStore = useWalletStore();
    useObserveGames();
    const { toast } = useToast();

    useEffect(() => {
        if (device || gameName) {
            if (device) {
                deviceStore.setDevice(JSON.parse(device));
            }
            if (gameName) router.push("/game-detail?game=" + gameName);
        }
    }, []);

    useEffect(() => {
        // walletStore.initializeWallet();
        walletStore.observeWalletChange();
    }, []);

    const hasMounted = useHasMounted();
    useEffect(() => {
        (async () => {
            if (workerStore.isLoading || workerStore.isReady) {
                return;
            }
            toast({
                title: "Web workers compiling contracts",
                description: "Web workers are compiling contracts, please wait",
            });
            await workerStore.startWorker();
            toast({
                title: "Web workers ready",
                description: "Web workers are ready",
            });
        })();
    }, [hasMounted]);

    useObserveUserLibrary();

    return <Store />;
}
