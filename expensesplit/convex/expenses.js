import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Добавить расход
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

// Последние N расходов
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db }, { limit = 5 }) => {
    const list = await db.query("expenses").collect();
    return list
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
      .slice(0, limit);
  },
});
