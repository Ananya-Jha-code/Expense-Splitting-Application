

import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

/**
 * Using Clerk webhooks so that Convex automatically syncs users
 * tracking authentication state
 */
export function authenticationState() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();

  return {
    isLoading,
    isAuthenticated,
    user,
  };
}
