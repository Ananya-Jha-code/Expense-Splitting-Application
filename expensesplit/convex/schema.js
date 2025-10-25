import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_email", { searchField: "email" }),

  // NEW: простая таблица расходов (без групп)
  expenses: defineTable({
    title: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),      // "USD" (по желанию)
    category: v.optional(v.string()),      // "Food", "Rent", ...
    payerToken: v.string(),                // кто оплатил (user.id из Clerk)
  })
    .index("by_payer", ["payerToken"])
    .searchIndex("search_title", { searchField: "title" }),
});
