import { action } from "./_generated/server";
import { v } from "convex/values";

// Uses Clerk Admin API with CLERK_SECRET_KEY to find a user by email
export const getUserByEmail = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const key = process.env.CLERK_SECRET_KEY;
    if (!key) throw new Error("Missing CLERK_SECRET_KEY (set it in Convex dashboard Dev → Settings → Environment)");

    const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Clerk lookup failed: ${res.status} ${res.statusText}`);
    }

    const users = await res.json(); // array
    const normalized = email.toLowerCase();
    const match = users.find(u =>
      (u.email_addresses || []).some(e => (e.email_address || "").toLowerCase() === normalized)
    );

    // Return minimal info if found
    return match ? { id: match.id, email: normalized } : null;
  },
});
