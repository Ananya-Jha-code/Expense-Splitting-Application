/*import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Replace with your own Clerk Issuer URL from your "convex" JWT template
      // or with `process.env.CLERK_JWT_ISSUER_DOMAIN`
      // and configure CLERK_JWT_ISSUER_DOMAIN on the Convex Dashboard
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ]
} satisfies AuthConfig;
*/
import type { AuthConfig } from "convex/server";

const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!issuer) {
  // Если переменная не задана — остановим запуск с понятной ошибкой
  throw new Error("Missing CLERK_JWT_ISSUER_DOMAIN env var");
}

export default {
  providers: [
    {
      domain: issuer,           // здесь уже точно string
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;