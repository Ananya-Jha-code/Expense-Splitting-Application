import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/header"; // relative path is safer
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/client-provider";
import { Global } from "recharts";

const inter = Inter({ subsets: ["latin"] });
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Expense Splitting Application",
  description: "Split your bills efficiently",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logos/logo-s.png" sizes="any" />
      </head>
      <body className={`${inter.className}`}>
        {/* Clerk handles authentication */}
        <ClerkProvider>
          {/* Convex client for your database/functions */}
          <ConvexClientProvider>
            <div
              id="global-loader"
              className="hidden fixed top-0 left-0 w-full h-[3px] bg-pink-500 z-[9999]"
            ></div>
            
            <Header />
            <main className="min-h-screen pt-20 px-6">{children}</main>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
