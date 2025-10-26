import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return [];
    const groups = await ctx.db.query("groups")
      .withIndex("by_owner", q => q.eq("ownerId", ident.subject))
      .collect();

    // Attach member counts
    return Promise.all(groups.map(async g => {
      const count = await ctx.db.query("groupMembers")
        .withIndex("by_group", q => q.eq("groupId", g._id)).collect();
      return { ...g, memberCount: count.length };
    }));
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    return ctx.db.insert("groups", {
      ownerId: ident.subject,
      name,
      createdAt: Date.now(),
    });
  },
});

export const members = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const links = await ctx.db.query("groupMembers")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
    const contacts = await Promise.all(
      links.map(l => ctx.db.get(l.contactId))
    );
    return contacts.filter(Boolean);
  },
});

export const addMember = mutation({
  args: { groupId: v.id("groups"), contactId: v.id("contacts") },
  handler: async (ctx, { groupId, contactId }) => {
    // basic existence checks
    const g = await ctx.db.get(groupId);
    const c = await ctx.db.get(contactId);
    if (!g || !c) throw new Error("Not found");

    // prevent duplicates
    const existing = await ctx.db.query("groupMembers")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
    if (existing.some(x => x.contactId === contactId)) return;

    await ctx.db.insert("groupMembers", { groupId, contactId });
  },
});

export const removeMember = mutation({
  args: { groupId: v.id("groups"), contactId: v.id("contacts") },
  handler: async (ctx, { groupId, contactId }) => {
    const links = await ctx.db.query("groupMembers")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
    const link = links.find(l => l.contactId === contactId);
    if (link) await ctx.db.delete(link._id);
  },
});


export const remove = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");
    if (group.ownerId !== ident.subject) throw new Error("Not allowed");

    // 1) Delete all member links
    const links = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const l of links) await ctx.db.delete(l._id);

    // 2) Delete all expenses and their splits
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    for (const e of expenses) {
      const splits = await ctx.db
        .query("splits")
        .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
        .collect();
      for (const s of splits) await ctx.db.delete(s._id);
      await ctx.db.delete(e._id);
    }

    // 3) Finally, delete the group
    await ctx.db.delete(groupId);
  },
});
