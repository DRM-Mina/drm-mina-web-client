"use client";
// import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "./components/sidebar";
import SearchBar from "./components/searchbar";
import Footer from "./components/footer";
import { useWorkerStore } from "@/lib/stores/workerStore";
import { useWalletStore } from "@/lib/stores/walletStore";
import { useObserveGames } from "@/lib/stores/gameStore";
import useHasMounted from "@/lib/customHooks";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useObserveUserLibrary } from "@/lib/stores/userStore";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const workerStore = useWorkerStore();
    const walletStore = useWalletStore();
    useObserveGames();
    walletStore.observeWalletChange();
    const { toast } = useToast();
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

    return (
        <html lang="en">
            <head>
                <title>DRM Mina</title>
                <meta charSet="utf-8" />
            </head>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="absolute inset-0 border-t">
                        <div className="absolute inset-0 bg-background">
                            <div className="grid grid-cols-6">
                                <Sidebar className="sticky top-0 col-span-1" />
                                <main className=" col-start-2 col-end-7 overflow-hidden">
                                    <SearchBar />
                                    {children}
                                </main>
                                <Footer className="col-start-2 col-end-7" />
                                <Toaster />
                            </div>
                        </div>
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
