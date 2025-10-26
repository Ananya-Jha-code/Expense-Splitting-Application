import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return [];
    return ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ident.subject))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    // (optional) duplicate-by-name guard
    // const dup = await ctx.db.query("contacts")
    //   .withIndex("by_owner", q => q.eq("ownerId", ident.subject))
    //   .filter(q => q.eq(q.field("name"), args.name))
    //   .first();
    // if (dup) throw new Error("Contact with that name already exists.");

    return ctx.db.insert("contacts", {
      ownerId: ident.subject,
      name: args.name,
      email: args.email,
      phone: args.phone,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, email, phone }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== ident.subject) throw new Error("Not found");
    await ctx.db.patch(id, { name, email, phone });
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, { id }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const row = await ctx.db.get(id);
    if (!row || row.ownerId !== ident.subject) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
