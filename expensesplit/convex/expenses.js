import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return ctx.db.query("expenses")
      .withIndex("by_group", q => q.eq("groupId", groupId))
      .collect();
  },
});

export const createEqualSplit = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(),             // total
  },
  handler: async (ctx, { groupId, description, amount }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    const memLinks = await ctx.db.query("groupMembers")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
    if (memLinks.length === 0) throw new Error("No members in group");

    const perHead = Math.round((amount / memLinks.length) * 100) / 100;

    const expenseId = await ctx.db.insert("expenses", {
      groupId, createdBy: ident.subject, description, amount, createdAt: Date.now(),
    });

    // Create splits
    for (const m of memLinks) {
      await ctx.db.insert("splits", {
        expenseId,
        contactId: m.contactId,
        share: perHead,
      });
    }
    return expenseId;
  },
});
export const createCustomSplit = mutation({
    args: {
      groupId: v.id("groups"),
      description: v.string(),
      shares: v.array(v.object({ contactId: v.id("contacts"), share: v.number() })),
    },
    async handler(ctx, { groupId, description, shares }) {
      const ident = await ctx.auth.getUserIdentity();
      if (!ident) throw new Error("Not authenticated");
      const total = shares.reduce((s, x) => s + x.share, 0);
      if (!(total > 0)) throw new Error("Total must be > 0");
  
      const expenseId = await ctx.db.insert("expenses", {
        groupId,
        createdBy: ident.subject,
        description,
        amount: Math.round(total * 100) / 100,
        createdAt: Date.now(),
      });
  
      for (const s of shares) {
        await ctx.db.insert("splits", {
          expenseId,
          contactId: s.contactId,
          share: Math.round(s.share * 100) / 100,
        });
      }
      return expenseId;
    },
  });
  
export const balances = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    // simple net balance per contact (positive = owes)
    const memLinks = await ctx.db.query("groupMembers")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
    const contacts = await Promise.all(memLinks.map(l => ctx.db.get(l.contactId)));
    const ids = contacts.filter(Boolean).map(c => c._id);

    const exps = await ctx.db.query("expenses")
      .withIndex("by_group", q => q.eq("groupId", groupId)).collect();

    const splits = [];
    for (const e of exps) {
      const parts = await ctx.db.query("splits")
        .withIndex("by_expense", q => q.eq("expenseId", e._id)).collect();
      splits.push(...parts);
    }

    const balance = new Map(ids.map(id => [id, 0]));
    for (const s of splits) {
      balance.set(s.contactId, (balance.get(s.contactId) ?? 0) + s.share);
    }
    // (Optional) subtract payer’s share if you track payers; here we’re just showing raw shares.

    return contacts.filter(Boolean).map(c => ({
      contactId: c._id,
      name: c.name,
      net: balance.get(c._id) ?? 0,
    }));
  },
});
