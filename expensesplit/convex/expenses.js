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

  const owed = new Map(ids.map((id) => [id, 0]));
  const paid = new Map(ids.map((id) => [id, 0]));

  const clerkIdByContact = new Map();
  for (const c of cleanContacts) {
    if (c.clerkUserId) clerkIdByContact.set(c.clerkUserId, c._id);
  }

  for (const e of exps) {
    const isSettlement = e.isSettlement ?? false;
    const payerContactId = isSettlement
      ? e.createdBy // createdBy is contactId for settlements
      : clerkIdByContact.get(e.createdBy) ?? null; // createdBy is clerkUserId for regular expenses
    
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
    amount: v.number(), 
    category: v.string(),
  },
  handler: async (ctx, { groupId, description, amount, category }) => {
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
      category: category ?? "Other", 
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
    category: v.string(),
  },
  async handler(ctx, { groupId, description, shares, category }) {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const total = shares.reduce((s, x) => s + x.share, 0);
    if (!(total > 0)) throw new Error("Total must be > 0");

    const expenseId = await ctx.db.insert("expenses", {
      groupId,
      createdBy: ident.subject,
      description,
      amount: Math.round(total * 100) / 100,
      category: category ?? "Other",
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


    const allContactIds = [...debtors.map(d => d.contactId), ...creditors.map(c => c.contactId)];
    const allContacts = await Promise.all(allContactIds.map(id => ctx.db.get(id)));
    const contactMap = new Map(allContacts.map(c => [c._id, c]));

    const results = [];
    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const amount = Math.min(d.net, c.net);

      if (amount < 0.01) break;
      const fromContact = contactMap.get(d.contactId);
      const toContact = contactMap.get(c.contactId);


      results.push({
        fromId: d.contactId,
        fromClerkUserId: fromContact?.clerkUserId,
        fromName: d.name,
        toId: c.contactId,
        toName: c.name,
        toClerkUserId: toContact?.clerkUserId, 
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

function normalizeId(userId) {
  return userId.split("|").pop();
}// in expenses.js
// ...
export const recordSettlement = mutation({
  args: {
    groupId: v.id("groups"),
    fromId: v.id("contacts"), // The person paying (debtor)
    toId: v.id("contacts"), // The person receiving (creditor)
    amount: v.number(),
  },
  handler: async (ctx, { groupId, fromId, toId, amount }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const temp = ident.subject; // The Clerk ID of the person clicking 'Settle'
    // Assuming you have a normalizeId function defined nearby
    const currentClerkId = normalizeId(temp); 

    if (amount <= 0) throw new Error("Settlement amount must be positive");

    // 1. Authorization Check (Keep this part for security)
    const [fromContact, toContact] = await Promise.all([
      ctx.db.get(fromId),
      ctx.db.get(toId),
    ]);
    if (!fromContact || !toContact) {
      throw new Error("One or both contacts not found.");
    }
    const isDebtor = fromContact.clerkUserId === currentClerkId;
    const isCreditor = toContact.clerkUserId === currentClerkId;
    
    if (!isDebtor && !isCreditor) {
      throw new Error("Only the involved parties can record a settlement.");
    }
   
    const description = `Settlement: ${fromContact.name} paid ${toContact.name} (Amount: ${amount.toFixed(2)})`;
    
    const expenseId = await ctx.db.insert("expenses", {
      groupId,
      createdBy: ident.subject, 
      description,
      amount: 0, 
      createdAt: Date.now(),
      isSettlement: true,
    });
    
    await ctx.db.insert("splits", {
      expenseId,
      contactId: fromId,
      share: -amount, // Reduces the debtor's owed (net decreases)
    });

    await ctx.db.insert("splits", {
      expenseId,
      contactId: toId,
      share: amount, // Increases the creditor's owed (net increases)
    });
    
    return expenseId;
  },
});


/* -------- existing simple add/recent for dashboard ------- */

export const add = mutation({
  args: {
    title: v.string(),
    amount: v.number(),
    category: v.string()    ,
    payerToken: v.string(),
    currency: v.optional(v.string()),
    groupId: v.optional(v.id("groups")), 
  },
  handler: async ({ db }, args) => {
    const { title, amount, category, payerToken, currency, groupId } = args;

    if (!category) throw new Error("Category is required");
    if (!title) throw new Error("Title is required");
    if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");
    if (!payerToken) throw new Error("payerToken is required");
    return await db.insert("expenses", {
      description: title,
      amount,
      category,
      groupId: groupId ?? undefined, // null for personal expenses
      createdBy: payerToken, // current user id
      createdAt: Date.now(),
    });
  },
});


export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db, auth }, { limit = 5 }) => {
    const ident = await auth.getUserIdentity();
    if (!ident) return []; 

    const myContact = await db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", ident.subject))
      .first();
    
    if (!myContact) return []; 

    const expenses = await db.query("expenses").order("desc").take(limit);

    return Promise.all(
      expenses.map(async (e) => {
        let groupName = "Personal";
        if (e.groupId) {
          const group = await db.get(e.groupId);
          if (group) groupName = group.name;
        }

        let myShareAmount = 0;
        // console.log("creaedby: ", e.createdBy);
        // console.log("Ident subj: ", ident.subject);
        if (e.groupId) {
          // Group expense: look for my split
          const split = await db
            .query("splits")
            .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
            .filter((q) => q.eq(q.field("contactId"), myContact._id))
            .first();
          if (split) myShareAmount = split.share;
        } else if (!e.groupId && e.createdBy === ident.subject) {
          // Personal expense: I paid the full amount
          myShareAmount = e.amount;
        }

        let displayAmount = myShareAmount; 
        if (e.isSettlement) {
             
             const match = e.description.match(/Amount:\s*([\d.]+)/);
             if (match) displayAmount = parseFloat(match[1]);
        }

        return {
          ...e,
          title: e.title || e.description || "Untitled",
          groupName,
          amount: displayAmount, 
          totalAmount: e.amount  
        };
      })
    );
  },
});