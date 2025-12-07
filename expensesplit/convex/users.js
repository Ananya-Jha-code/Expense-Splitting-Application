import { mutation, query } from "./_generated/server";
import { v } from "convex/values"; 


import { internalMutation } from "./_generated/server";
import { UserJSON } from "@clerk/backend";

// user.created and user.updated events
export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, 
  async handler(ctx, { data }) {
    const tokenIdentifier = `clerk|${data.id}`; 
    const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const username = data.username ?? "";

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, { name, email, username });
    } else {
      await ctx.db.insert("users", { name, email, username, tokenIdentifier });
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const tokenIdentifier = `clerk|${clerkUserId}`; 
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();

    if (user) {
      await ctx.db.delete(user._id);
    } else {
      console.warn("No user found in Convex for Clerk ID:", clerkUserId);
    }
  },
});

export const search = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const t = term.trim();
    if (t === "") return [];

    // Search across multiple fields
    const nameMatches = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", t))
      .take(5);

    const emailMatches = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", t))
      .take(5);

    const usernameMatches = await ctx.db
      .query("users")
      .withSearchIndex("search_username", (q) => q.search("username", t))
      .take(5);

    
    const all = [...nameMatches, ...emailMatches, ...usernameMatches];
    const seen = new Set();
    return all
    .filter((u) => {
      if (seen.has(u._id.id)) return false;
      seen.add(u._id.id);
      return true;
    })
    .map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      username: u.username,
      tokenIdentifier: u.tokenIdentifier   // ← IMPORTANT
    }));

  },
});