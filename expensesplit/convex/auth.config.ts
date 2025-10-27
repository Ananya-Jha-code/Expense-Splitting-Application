import { AuthConfig } from "convex/server";


const ISSUER = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!ISSUER) {
  throw new Error(
    "❌ Missing CLERK_JWT_ISSUER_DOMAIN. Please set it in your `.env.local` and in your Convex dashboard (Dev → Settings → Environment Variables)."
  );
} else {
  console.log("✅ CLERK_JWT_ISSUER_DOMAIN is set:", ISSUER);
}

export default {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template
      // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
      // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: "https://saved-tetra-44.clerk.accounts.dev",
      applicationID: "convex",
    },
  ]
} satisfies AuthConfig;