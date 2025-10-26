"use client";

import React from "react";
import { motion } from "framer-motion";
import { PiggyBank } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";



const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const LandingPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect signed-in users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);
  
  if (!isLoaded || isSignedIn ) return null;

  return (
    <main className="relative flex flex-col items-center justify-center h-screen text-white">
      {/* Background blob behind text */}
      <div className="absolute w-[58rem] h-[35rem] bg-gradient-to-br from-orange-400 via-pink-400 to-pink-500 rounded-full opacity-40 blur-3xl -z-10"></div>

      <motion.div
        className={`flex flex-col items-center space-y-8 ${playfair.className}`}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <PiggyBank size={150} strokeWidth={2} />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-8xl font-bold tracking-wide text-center drop-shadow-2xl"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          Expense Splitter
        </motion.h1>

        {/* Tagline */}
        <p className="text-2xl opacity-90 font-medium text-center">
          Simplify your group expenses effortlessly
        </p>
      </motion.div>
    </main>
  );
};

export default LandingPage;
