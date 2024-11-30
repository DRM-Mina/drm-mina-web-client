"use client";
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
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useObserveUserLibraryRoutine } from "@/lib/stores/userStore";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const workerStore = useWorkerStore();
  const walletStore = useWalletStore();
  useObserveGames();

  const { toast } = useToast();
  const hasMounted = useHasMounted();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (
        workerStore.isLoading ||
        workerStore.isReady ||
        !hasMounted ||
        isMobile
      ) {
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

  useEffect(() => {
    walletStore.observeWalletChange();
  }, [walletStore.observeWalletChange]);

  useObserveUserLibraryRoutine();

  return (
    <html lang="en">
      <head>
        <title>DRM Mina</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="DRM Mina is a game marketplace connecting game creators and players on Mina Protocol. It uses zk-proofs to prevent piracy and ensure data privacy, empowering game developers and players alike."
        />
        <meta
          name="keywords"
          content="DRM Mina, game marketplace, Mina Protocol, zk-proofs, anti-piracy, game developers, decentralized gaming"
        />
        <meta name="author" content="kadirchan" />
        <meta property="og:title" content="DRM Mina" />
        <meta
          property="og:description"
          content="DRM Mina is a game marketplace connecting game creators and players on Mina Protocol. It uses zk-proofs to prevent piracy and ensure data privacy, empowering game developers and players alike."
        />
        <meta property="og:url" content="https://drmmina.com" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {!isMobile ? (
            <div className="absolute inset-0 border-t">
              <div className="absolute inset-0 bg-background">
                <div className="grid grid-cols-6">
                  <Sidebar
                    className="sticky top-0 col-span-1"
                    aria-label="Main Navigation"
                    role="navigation"
                  />
                  <main className=" col-start-2 col-end-7 overflow-hidden">
                    <SearchBar aria-label="Search Games" />
                    {children}
                  </main>
                  <Footer
                    className="col-start-2 col-end-7"
                    aria-label="Footer"
                  />
                  <Toaster />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-screen m-10">
              <p className="text-center text-lg font-semibold">
                DRM Mina is not available on mobile devices yet.
              </p>
              <p className="text-center text-lg font-semibold">
                Please use a desktop browser.
              </p>
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
