"use client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

export default function SearchBar() {
  const router = useRouter();

  return (
    <div className="relative top-0 flex items-center justify-center px-8 py-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const search = (e.target as HTMLFormElement)["search"].value;
          (e.target as HTMLFormElement)["search"].value = "";
          router.push("/browse?search=" + search);
        }}
      >
        <div className="relative w-[30vw]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            name="search"
            placeholder="Search games..."
            className="w-full appearance-none bg-background pl-8 shadow-none"
          />
        </div>
      </form>
    </div>
  );
}
