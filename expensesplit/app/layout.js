import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "../components/header"; // relative path is safer
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/convex-client-provider";

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
            <Header />
            <main className="min-h-screen">{children}</main>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}


// import { Inter, Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import Header from "@/components/header";
// import { ConvexClientProvider } from "@/components/convex-client-provider";
// import { ClerkProvider } from "@clerk/nextjs";
// const inter = Inter({subsets:["latin"]});
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata = {
//   title: "Expense Splitting Application",
//   description: "Split your bills efficiently",
// };

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <head>
//         <link rel="icon" href='/logos/logo-s.png' sizes="any"/>
//       </head>
//       <body className={`${inter.className} `}>
//         <ClerkProvider>
//         <ConvexClientProvider>
//           <Header/>
//           <main className="min-h-screen">{children}</main>

//         </ConvexClientProvider>
//         </ClerkProvider>
        
//       </body>
//     </html>
//   );
// }
