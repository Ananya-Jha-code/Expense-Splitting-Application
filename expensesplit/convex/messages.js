import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List messages for a group (real-time updates)
 */
export const list = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return ctx.db
      .query("messages")
      .withIndex("by_group_time", q => q.eq("groupId", groupId))
      .order("asc")
      .collect();
  },
});

/**
 * Send a new message in a group
 */
export const send = mutation({
  args: { groupId: v.id("groups"), text: v.string() },
  handler: async (ctx, { groupId, text }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    await ctx.db.insert("messages", {
      groupId,
      senderId: ident.subject,
      senderName: ident.nickname || "User",
      text: text.trim(),
      createdAt: Date.now(),
    });
  },
});
