"use client";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
// import { ConvexReactClient, ConvexProviderWithClerk } from "convex/react";


// Initialize Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

// "use client";
// import { ConvexReactClient, ConvexProviderWithClerk } from "convex/react";
// import { ConvexProvider, ConvexReactClient } from "convex/react";
// import { useAuth } from "@clerk/nextjs";

// // Initialize Convex client with your deployment URL
// const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// export function ConvexClientProvider({ children }) {
//   return (
//     <ConvexProvider client={convex} useAuth={useAuth}>
//       {children}
//     </ConvexProvider>
//   );
// }


// "use client";

// import { useAuth } from "@clerk/nextjs";
// import { ConvexProvider, ConvexReactClient } from "convex/react";

// const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// export function ConvexClientProvider({ children }) {
//   return( 
//   <ConvexProvider
//     client={convex}
//         useAuth={useAuth}
//         >
//     {children}
//     </ConvexProvider>

//   );
// }