"use client";
// import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "./components/sidebar";
import SearchBar from "./components/searchbar";
import Footer from "./components/footer";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//     title: "DRM Mina",
//     description: "Game Marketplace of Mina",
// };

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
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
