import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((s || "").trim());
const normalizeEmail = (s) => s?.trim().toLowerCase() || undefined;

/** Read contacts (unchanged) */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) return [];
    return ctx.db.query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ident.subject))
      .collect();
  },
});

/** ACTION: validate via Clerk, then write via a mutation */
export const createChecked = action({
  args: {
    name: v.string(),
    email: v.string(),               // require email for this rule
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { name, email, phone }) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    const emailLower = normalizeEmail(email);
    if (!emailLower || !isValidEmail(emailLower)) {
      return { success: false, message: "Invalid email address." };
    }

    // Look up user in Clerk Admin API
    const key = process.env.CLERK_SECRET_KEY;
    if (!key) throw new Error("Missing CLERK_SECRET_KEY in Convex env.");

    const res = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(emailLower)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`Clerk lookup failed: ${res.status} ${res.statusText}`);
    const users = await res.json();
    const match = users.find(u =>
      (u.email_addresses || []).some(e => (e.email_address || "").toLowerCase() === emailLower)
    );
    if (!match) {
      return { success: false, message: "No registered user with this email was found." };
    }

    // call the mutation to insert
    const result = await ctx.runMutation(api.contacts._createAfterCheck, {
      ownerId: ident.subject,
      name,
      email: emailLower,
      phone: phone?.trim() || undefined,
      clerkUserId: match.id,
    }); 
    if (result?.success === false) {
      return result;
    }
    
    return { success: true, contactId: result };
  },
});

function normalizePhone(phone) {
  return phone?.replace(/\D/g, "").slice(-10) || null; // last 10 digits only
}

/** MUTATION: assumes checks already done; just writes */
export const _createAfterCheck = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { ownerId, name, email, phone, clerkUserId }) => {
    // dedupe per owner by email
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    if (existing.some((c) => (c.emailLower || "") === email)) {
      return { success: false, message: "A contact with this email already exists." };
    }
    // duplicate by phone (if provided)
    const phoneNorm = normalizePhone(phone);
    if (phoneNorm && existing.some((c) => normalizePhone(c.phone) === phoneNorm)) {
      return { success: false, message: "A contact with this phone number already exists." };
    }

    const id= await ctx.db.insert("contacts", {
      ownerId,
      name: name.trim(),
      email,
      emailLower: email,     // store normalized
      phone,
      clerkUserId,
      createdAt: Date.now(),
    });
    return id;
  },
});

/** Update (still a mutation; no network I/O) */
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

    const emailLower = normalizeEmail(email);
    if (emailLower && !isValidEmail(emailLower)) {
      throw new Error("Invalid email address.");
    }

    // if email changed, you could require re-verify via an ACTION similarly
    const siblings = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerId", ident.subject))
      .collect();
    if (emailLower && siblings.some((c) => c._id !== id && (c.emailLower || "") === emailLower)) {
      throw new Error("Another contact already uses this email.");
    }

    await ctx.db.patch(id, {
      name: name.trim(),
      email: emailLower || undefined,
      emailLower: emailLower || undefined,
      phone: phone?.trim() || undefined,
    });
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
