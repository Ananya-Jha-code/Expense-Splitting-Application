"use client";

import React from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { BarLoader } from "react-spinners";
import { useStoreUser } from "../hooks/use-store-user";

const Header = () => {
  const { isLoading } = useStoreUser();

  return (
    <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
      <nav className="flex items-center justify-between px-4 py-2">
        <div className="text-lg font-semibold">Expense Splitter</div>
        <div>
          <SignedOut>
            <div className="flex gap-2">
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>

      {isLoading && <BarLoader width={"100%"} color="#36d7b7" />}
    </header>
  );
};

export default Header;
