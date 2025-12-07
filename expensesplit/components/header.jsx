// "use client";

// import React from "react";
// import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useClerk} from "@clerk/nextjs";
// import { BarLoader } from "react-spinners";
// import Link from "next/link";
// import { authenticationState } from "../hooks/storeUserDB";
// import { Unauthenticated } from "convex/react";
// import { Button } from "./ui/button"
// import { LayoutDashboard, PiggyBank } from "lucide-react";

// const Header = () => {
//   const { isLoading } = authenticationState();

//   return (
//     <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
//       <nav className="flex items-center justify-between px-6 py-3">
//         <div className="flex items-center gap-4">
//           <PiggyBank
//             size={50}          
//             strokeWidth={2.5}  
//             className="text-pink-500"
//           />

//           <SignedIn>
//             <Link href="/dashboard">
//               <Button
//                 variant="outline"
//                 className="hidden md:inline-flex items-center gap-2 text-base font-medium text-pink-500 hover:text-pink-500 hover:border-pink-600 transition"
//               >
//                 <LayoutDashboard className="h-4 w-4" />
//                 Dashboard
//               </Button>
//             </Link>
//           </SignedIn>

//         </div>
//         <div>
//           <SignedOut>
//             <div className="flex gap-2">
//               <SignInButton mode="redirect" redirecturl="/dashboard">
//                 <Button variant={"ghost"}>Sign In</Button>
//               </SignInButton>
//               <SignUpButton mode="redirect" redirecturl="/dashboard">
//                 <Button className="bg-pink-500 hover:bg-pink-600 border-none">
//                   Get Started
//                 </Button>
//               </SignUpButton>
//             </div>
//           </SignedOut>
//           <SignedIn>
//             <div className="flex items-center gap-5">
//               <Link href="/contacts">
//                 <Button
//                   variant="ghost"
//                   className="text-base font-medium text-pink-500  hover:text-pink-600 transition"
//                 >
//                   Contacts
//                 </Button>
//               </Link>
//               <Link href="/groups">
//                 <Button
//                   variant="ghost"
//                   className="text-base text-pink-500 text-pink-500 hover:text-pink-600 transitions"
//                 >
//                   Groups
//                 </Button>
//               </Link>
//               <UserButton afterSignOutUrl="/" />
//             </div>
//           </SignedIn>
//         </div>

//       </nav>

//       {isLoading && <BarLoader id="global-loader" width={"100%"} color="#e01f73ff" />}
//     </header>
//   );
// };

// export default Header;

"use client";

import React, { useEffect, useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { BarLoader } from "react-spinners";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { LayoutDashboard, PiggyBank } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // pathname change = trigger
    setIsPageLoading(true);

    // timeout to simulate loading
    const timeout = setTimeout(() => setIsPageLoading(false), 500);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
      <div className="relative">
        <nav className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <PiggyBank size={50} strokeWidth={2.5} className="text-pink-500" />

            <SignedIn>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="hidden md:inline-flex items-center gap-2 text-base font-medium text-pink-500 hover:text-pink-500 hover:border-pink-600 transition"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>

          <div>
            <SignedOut>
              <div className="flex gap-2">
                <SignInButton mode="redirect" redirecturl="/dashboard">
                  <Button variant="ghost">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="redirect" redirecturl="/dashboard">
                  <Button className="bg-pink-500 hover:bg-pink-600 border-none">
                    Get Started
                  </Button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-5">
                <Link href="/contacts">
                  <Button
                    variant="ghost"
                    className="text-base font-medium text-pink-500 hover:text-pink-600 transition"
                  >
                    Contacts
                  </Button>
                </Link>
                <Link href="/groups">
                  <Button
                    variant="ghost"
                    className="text-base text-pink-500 hover:text-pink-600 transition"
                  >
                    Groups
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant="ghost"
                    className="text-base text-pink-500 hover:text-pink-600 transition"
                  >
                    Messages
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </nav>

        {isPageLoading && (
          <div className="absolute bottom-0 left-0 w-full">
            <BarLoader width={"100%"} color="#e01f73ff" height={3} />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;