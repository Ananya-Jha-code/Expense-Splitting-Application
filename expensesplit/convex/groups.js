import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Helper: all groups this logged-in user should see
 * - groups they OWN (ownerId === ident.subject)
 * - groups where they are a MEMBER (via contact.clerkUserId === ident.subject)
 */
async function groupsVisibleToUser(ctx) {
  const ident = await ctx.auth.getUserIdentity();
  if (!ident) return [];
  const userId = ident.subject;

  // 1) Groups this user OWNS
  const owned = await ctx.db
    .query("groups")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();

  // 2) Contacts in any address book that correspond to this user
  const myContacts = await ctx.db
    .query("contacts")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
    .collect();

  const contactIds = myContacts.map((c) => c._id);

  // 3) Groups where these contacts are members
  const memberGroupIds = new Set();
  for (const cid of contactIds) {
    const links = await ctx.db
      .query("groupMembers")
      .withIndex("by_contact", (q) => q.eq("contactId", cid))
      .collect();
    for (const l of links) {
      memberGroupIds.add(l.groupId);
    }
  }

  const memberGroups = [];
  for (const gid of memberGroupIds) {
    const g = await ctx.db.get(gid);
    if (g) memberGroups.push(g);
  }

  // 4) Merge & dedupe
  const map = new Map();
  for (const g of owned) map.set(g._id, g);
  for (const g of memberGroups) map.set(g._id, g);

  return Array.from(map.values());
}

/* ----------------- list groups for current user ----------------- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const visible = await groupsVisibleToUser(ctx);

    // attach memberCount & sort
    const withCounts = [];
    for (const g of visible) {
      const links = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect();
      withCounts.push({
        ...g,
        memberCount: links.length,
      });
    }

    withCounts.sort((a, b) => b.createdAt - a.createdAt);
    return withCounts;
  },
});

/* ----------------- create group (owner = me) ----------------- */

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) {
      return { success: false, message: "Not authenticated" };
    }
    const userId = ident.subject;
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: "Name is required" };
    }

    // prevent duplicate group names per owner
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_owner_name", (q) =>
        q.eq("ownerId", userId).eq("name", trimmed)
      )
      .first();

    if (existing) {
      return {
        success: false,
        message: "You already have a group with this name.",
      };
    }

    const groupId = await ctx.db.insert("groups", {
      ownerId: userId,
      name: trimmed,
      createdAt: Date.now(),
    });

    return { success: true, groupId };
  },
});

/* ----------------- get group by name, if user can see it ----------------- */

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return null;
    const userId = ident.subject;
    const trimmed = name.trim();

    // contacts for this user
    const myContacts = await ctx.db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
      .collect();
    const myContactIds = new Set(myContacts.map((c) => c._id));

    // scan all groups with this name
    const allGroups = await ctx.db.query("groups").collect();
    const matches = allGroups.filter((g) => g.name === trimmed);

    for (const g of matches) {
      if (g.ownerId === userId) {
        return g; // I own it
      }
      // otherwise, check if any of MY contacts is a member
      const links = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", g._id))
        .collect();
      const isMember = links.some((l) => myContactIds.has(l.contactId));
      if (isMember) {
        return g;
      }
    }

    // no accessible group with this name
    return null;
  },
});

/* ----------------- members & membership changes ----------------- */

export const members = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const links = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const contacts = await Promise.all(
      links.map((l) => ctx.db.get(l.contactId))
    );
    return contacts.filter(Boolean);
  },
});

export const addMember = mutation({
  args: {
    groupId: v.id("groups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, { groupId, contactId }) => {
    // avoid duplicates
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .filter((q) => q.eq(q.field("contactId"), contactId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("groupMembers", {
      groupId,
      contactId,
    });
  },
});

export const removeMember = mutation({
  args: {
    groupId: v.id("groups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, { groupId, contactId }) => {
    const links = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .filter((q) => q.eq(q.field("contactId"), contactId))
      .collect();

    for (const l of links) {
      await ctx.db.delete(l._id);
    }
  },
});

/* ----------------- delete group (owner only) ----------------- */

export const remove = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, { groupId }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const userId = ident.subject;

    const group = await ctx.db.get(groupId);
    if (!group || group.ownerId !== userId) {
      throw new Error("Not allowed to delete this group");
    }

    // delete members
    const memLinks = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const l of memLinks) {
      await ctx.db.delete(l._id);
    }

    // delete expenses & splits
    const exps = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const e of exps) {
      const parts = await ctx.db
        .query("splits")
        .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
        .collect();
      for (const s of parts) {
        await ctx.db.delete(s._id);
      }
      await ctx.db.delete(e._id);
    }

    // finally delete group
    await ctx.db.delete(groupId);
  },
});
