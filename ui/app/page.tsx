"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useDeviceStore } from "@/lib/stores/deviceStore";
import Store from "@/app/store/page";

function Page() {
    const gameName = useSearchParams()?.get("game");
    const device = useSearchParams()?.get("device");
    const router = useRouter();
    const deviceStore = useDeviceStore();

    useEffect(() => {
        if (device || gameName) {
            if (device) {
                deviceStore.setDevice(JSON.parse(device));
                console.log("device", device);
            }
            if (gameName) router.push("/game-detail?game=" + gameName);
        }
    }, []);

    return <Store />;
}

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page />
        </Suspense>
    );
}
