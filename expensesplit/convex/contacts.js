import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((s || "").trim());
const normalizeEmail = (s) => s?.trim().toLowerCase() || undefined;

function normalizePhone(phone) {
  return phone?.replace(/\D/g, "").slice(-10) || null; // last 10 digits only
}

// List contacts for the logged-in user
export const list = query({
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return [];
    return ctx.db.query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ident.subject))
      .collect();
  },
});

export const getMyContactId = query({
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return null;
    
    const currentClerkId = ident.subject;
    const userContacts = await ctx.db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", currentClerkId))
      .collect();

    const myOwnContact = userContacts.find(
        (contact) => contact.ownerId === currentClerkId
    );

    return myOwnContact?._id ?? null;
  },
});



function normalizeId(userId) {
  return userId.split("|").pop();
}
// Create or ensure the current user's own contact exists
export const ensureOwnContact = mutation({
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");
    const userId = ident.subject;

    // Try to find contact by clerkUserId (unique for each user)
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", userId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new contact record for the user themselves
    const newContactId = await ctx.db.insert("contacts", {
      ownerId: userId,
      name: ident.name || "Unnamed User",
      email: ident.emailAddresses?.[0]?.emailAddress || undefined,
      phone: undefined,
      clerkUserId: normalizeId(userId),
      createdAt: Date.now(),
    });

    return newContactId;
  },
});

// Create a new contact after validation (used for adding other contacts)
export const _createAfterCheck = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { ownerId, name, email, phone, clerkUserId }) => {
    const normalizedClerkUserId = clerkUserId.split("|").pop();

    // Get existing contacts of the owner
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();

    // Deduplicate by clerkUserId (to avoid duplicate contacts for same user)
    if (existing.some((c) => c.clerkUserId === clerkUserId)) {
      return { success: false, message: "This contact already exists." };
    }

    // Deduplicate by email (case insensitive)
    const emailLower = normalizeEmail(email);
    if (existing.some((c) => (c.emailLower || "") === emailLower)) {
      return { success: false, message: "A contact with this email already exists." };
    }

    // Deduplicate by phone if provided
    const phoneNorm = normalizePhone(phone);
    if (phoneNorm && existing.some((c) => normalizePhone(c.phone) === phoneNorm)) {
      return { success: false, message: "A contact with this phone number already exists." };
    }

    const id = await ctx.db.insert("contacts", {
      ownerId,
      name: name.trim(),
      email,
      emailLower,
      phone,
      clerkUserId: normalizedClerkUserId,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Remove a contact owned by the user
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