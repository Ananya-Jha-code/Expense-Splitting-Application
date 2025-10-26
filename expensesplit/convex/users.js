import { mutation } from "./_generated/server";
import { v } from "convex/values"; 

// export const store = mutation({
//   args: {},
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("Called storeUser without authentication present");
//     }
//     const email = identity.email ?? "";
//     const username = identity.username ?? "";
//     const name = identity.name ?? "Anonymous";
//     const tokenIdentifier = identity.tokenIdentifier ?? "";
//     console.log("🟢 store user:", tokenIdentifier);

//     // Check if we've already stored this identity before.
//     // Note: If you don't want to define an index right away, you can use
//     // ctx.db.query("users")
//     //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
//     //  .unique();
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) =>
//         q.eq("tokenIdentifier", identity.tokenIdentifier),
//       )
//       .unique();
//     if (user !== null) {
//       // If we've seen this identity before but the name has changed, patch the value.
//       const updates = {};
//       if (user.name !== name) updates.name = name;
//       if (user.username !== username) updates.username = username;
//       if (Object.keys(updates).length > 0) {
//         await ctx.db.patch(user._id, updates);
//       }
//       return user._id;
//       // if (user.name !== identity.name) {
//       //   await ctx.db.patch(user._id, { name: identity.name });
//       // }
//       // return user._id;
//     }
//     if (email) {
//       const existingEmailUser = await ctx.db
//         .query("users")
//         .withIndex("by_email", (q) => q.eq("email", email))
//         .unique();

//       if (existingEmailUser) {
//         throw new Error("This email is already registered with another account.");
//       }
//     }

//     if (username) {
//       const existingUsernameUser = await ctx.db
//         .query("users")
//         .withIndex("by_username", (q) => q.eq("username", username))
//         .unique();

//       if (existingUsernameUser) {
//         throw new Error("This username is already taken.");
//       }
//     }
//     // If it's a new identity, create a new `User`.
//     return await ctx.db.insert("users", {
//       name,
//       email,
//       username,
//       tokenIdentifier,
//     });
//   },
// });
// export const deleteUser = mutation({
//   args: { tokenIdentifier: v.string() },
//   handler: async (ctx, args) => {
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
//       .unique();

//     if (user) {
//       await ctx.db.delete(user._id);
//     }
//   },
// });

import { internalMutation } from "./_generated/server";
import { UserJSON } from "@clerk/backend";

// user.created and user.updated events
export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, 
  async handler(ctx, { data }) {
    const tokenIdentifier = `clerk|${data.id}`; 
    console.log("🟢 upsertFromClerk inserted/updated user with token:", tokenIdentifier);
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

/**
 * Handles user.deleted event from Clerk.
 */
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const tokenIdentifier = `clerk|${clerkUserId}`; // Match what was stored
        console.log("🧨 deleteFromClerk searching for:", tokenIdentifier);
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
