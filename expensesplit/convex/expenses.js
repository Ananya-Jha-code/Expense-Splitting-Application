import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/* ----------------------- helpers ----------------------- */

async function computeGroupBalances(ctx, groupId) {
  // All members of this group
  const memLinks = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  const contacts = await Promise.all(
    memLinks.map((l) => ctx.db.get(l.contactId))
  );
  const cleanContacts = contacts.filter(Boolean);
  const ids = cleanContacts.map((c) => c._id);

  // All expenses in this group
  const exps = await ctx.db
    .query("expenses")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  // Maps: how much each contact OWES (their split) and how much they PAID
  const owed = new Map(ids.map((id) => [id, 0]));
  const paid = new Map(ids.map((id) => [id, 0]));

  // We’ll try to match expense.createdBy (Clerk user id) to a contact in this group
  const clerkIdByContact = new Map();
  for (const c of cleanContacts) {
    if (c.clerkUserId) clerkIdByContact.set(c.clerkUserId, c._id);
  }

  for (const e of exps) {
    // find payer contact for this expense (if any)
    const payerContactId = clerkIdByContact.get(e.createdBy) ?? null;

    const parts = await ctx.db
      .query("splits")
      .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
      .collect();

    // each participant owes their share
    for (const s of parts) {
      owed.set(s.contactId, (owed.get(s.contactId) ?? 0) + s.share);
    }

    // payer actually paid the whole expense
    if (payerContactId) {
      paid.set(
        payerContactId,
        (paid.get(payerContactId) ?? 0) + e.amount
      );
    }
  }

  // net = owed - paid
  return cleanContacts.map((c) => {
    const net = (owed.get(c._id) ?? 0) - (paid.get(c._id) ?? 0);
    return {
      contactId: c._id,
      name: c.name,
      net,
    };
  });
}

/* ----------------- existing endpoints ------------------ */

export const listByGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
  },
});

export const createEqualSplit = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(), // total
  },
  handler: async (ctx, { groupId, description, amount }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    const memLinks = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    if (memLinks.length === 0) throw new Error("No members in group");

    const perHead = Math.round((amount / memLinks.length) * 100) / 100;

    const expenseId = await ctx.db.insert("expenses", {
      groupId,
      createdBy: ident.subject,
      description,
      amount,
      createdAt: Date.now(),
    });

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
    shares: v.array(
      v.object({ contactId: v.id("contacts"), share: v.number() })
    ),
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

/* ---------------- balances + settlements ---------------- */

export const balances = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    return await computeGroupBalances(ctx, groupId);
  },
});

export const settlements = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const bals = await computeGroupBalances(ctx, groupId);

    const debtors = [];
    const creditors = [];

    for (const b of bals) {
      const net = Math.round((b.net ?? 0) * 100) / 100;
      if (Math.abs(net) < 0.01) continue; // ignore tiny rounding noise

      if (net > 0) {
        // owes money
        debtors.push({ ...b, net });
      } else if (net < 0) {
        // is owed money
        creditors.push({ ...b, net: -net });
      }
    }

    // biggest amounts first
    debtors.sort((a, b) => b.net - a.net);
    creditors.sort((a, b) => b.net - a.net);

    const results = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const amount = Math.min(d.net, c.net);

      if (amount < 0.01) break;

      results.push({
        fromId: d.contactId,
        fromName: d.name,
        toId: c.contactId,
        toName: c.name,
        amount: Math.round(amount * 100) / 100,
      });

      d.net -= amount;
      c.net -= amount;

      if (d.net <= 0.01) i++;
      if (c.net <= 0.01) j++;
    }

    return results;
  },
});

/* -------- existing simple add/recent for dashboard ------- */

export const add = mutation({
  args: {
    title: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    payerToken: v.string(),
    currency: v.optional(v.string()),
  },
  handler: async ({ db }, args) => {
    return await db.insert("expenses", args);
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db }, { limit = 5 }) => {
    const list = await db.query("expenses").collect();
    return list
      .sort(
        (a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0)
      )
      .slice(0, limit);
  },
});
