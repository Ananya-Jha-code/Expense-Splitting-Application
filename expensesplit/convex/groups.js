// import { v } from "convex/values";
// import { query, mutation, internalMutation } from "./_generated/server";
// import { internal } from "./_generated/api";

// export const list = query({
//   args: {},
//   handler: async (ctx) => {
//     const ident = await ctx.auth.getUserIdentity();
//     if (!ident) return [];
//     const groups = await ctx.db.query("groups")
//       .withIndex("by_owner", q => q.eq("ownerId", ident.subject))
//       .collect();

//     // Attach member counts
//     return Promise.all(groups.map(async g => {
//       const count = await ctx.db.query("groupMembers")
//         .withIndex("by_group", q => q.eq("groupId", g._id)).collect();
//       return { ...g, memberCount: count.length };
//     }));
//   },
// });

// export const create = mutation({
//   args: { name: v.string(), initialContactIds: v.array(v.id("contacts"))},
//   handler: async (ctx, { name , initialContactIds}) => {
//     const ident = await ctx.auth.getUserIdentity();
//     if (!ident) throw new Error("Not authenticated");

//     const trimmedName = name.trim();
//     const ownerId = ident.subject;

//     // check if a group with this name already exists
//     const existing = await ctx.db
//       .query("groups")
//       .withIndex("by_owner_name", (q) =>
//         q.eq("ownerId", ownerId).eq("name", trimmedName)
//       )
//       .first();

//     if (existing) {
//       return { success: false, message: `You already have a group with this name. Try a different one!` };
      
//       //throw new Error(`You already have a group called "${trimmedName}"`);
//     }

//     if (initialContactIds.length === 0) {
//         return { success: false, message: `Please select at least one contact for the group.` };
//     }

//     const groupId = await ctx.db.insert("groups", {
//       ownerId,
//       name,
//       createdAt: Date.now(),
//       conversationId: undefined,
//     });

//     const ownerChatInfo = { 
//         id: ident.tokenIdentifier, 
//         name: ident.name ?? ident.emailAddress 
//     };

//     const contactChatInfo = (await Promise.all(
//         initialContactIds.map(async (contactId) => {
//             const contact = await ctx.db.get(contactId);
//             if (contact) {
//                 // Insert the group member link using the REAL groupId
//                 await ctx.db.insert("groupMembers", { groupId, contactId });
//                 const memberIdForChat = contact.clerkUserId || contact._id;
//                 // Return data for the chat creation
//                 return { 
//                     id: memberIdForChat, 
//                     name: contact.name 
//                 };
//             }
//             return null;
//         })
//     )).filter(Boolean);

//     let allChatMembers = [ownerChatInfo, ...contactChatInfo];
//     const uniqueChatMembers = Array.from(new Map(allChatMembers.map(m => [m.id, m])).values());

    
//     const { conversationId } = await ctx.runMutation(internal.messages.internalCreateGroupChat, {
//         groupName: trimmedName,
//         memberInfo: uniqueChatMembers,
//     });

//     await ctx.db.patch(groupId, { conversationId });

    
//     return { success: true, id: groupId };


    
//   },
// });

// //get group by name for routing
// export const getByName = query({
//   args: { name: v.string() },
//   handler: async (ctx, { name }) => {
//     const ident = await ctx.auth.getUserIdentity();
//     if (!ident) return null;

//     const group = await ctx.db
//       .query("groups")
//       .withIndex("by_owner_name", (q) =>
//         q.eq("ownerId", ident.subject).eq("name", name.trim())
//       )
//       .first();

//     return group ?? null;
//   },
// });

// export const members = query({
//   args: { groupId: v.id("groups") },
//   handler: async (ctx, { groupId }) => {
//     const links = await ctx.db.query("groupMembers")
//       .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
//     const contacts = await Promise.all(
//       links.map(l => ctx.db.get(l.contactId))
//     );
//     return contacts.filter(Boolean);
//   },
// });

// export const addMember = mutation({
//   args: { groupId: v.id("groups"), contactId: v.id("contacts") },
//   handler: async (ctx, { groupId, contactId }) => {
//     // basic existence checks
//     const g = await ctx.db.get(groupId);
//     const c = await ctx.db.get(contactId);
//     if (!g || !c) throw new Error("Not found");

//     // prevent duplicates
//     const existing = await ctx.db.query("groupMembers")
//       .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
//     if (existing.some(x => x.contactId === contactId)) return;

//     await ctx.db.insert("groupMembers", { groupId, contactId });
//   },
// });

// export const removeMember = mutation({
//   args: { groupId: v.id("groups"), contactId: v.id("contacts") },
//   handler: async (ctx, { groupId, contactId }) => {
//     const links = await ctx.db.query("groupMembers")
//       .withIndex("by_group", q => q.eq("groupId", groupId)).collect();
//     const link = links.find(l => l.contactId === contactId);
//     if (link) await ctx.db.delete(link._id);
//   },
// });


// export const remove = mutation({
//   args: { groupId: v.id("groups") },
//   handler: async (ctx, { groupId }) => {
//     const ident = await ctx.auth.getUserIdentity();
//     if (!ident) throw new Error("Not authenticated");

//     const group = await ctx.db.get(groupId);
//     if (!group) throw new Error("Group not found");
//     if (group.ownerId !== ident.subject) throw new Error("Not allowed");

//     // 1) Delete all member links
//     const links = await ctx.db
//       .query("groupMembers")
//       .withIndex("by_group", (q) => q.eq("groupId", groupId))
//       .collect();
//     for (const l of links) await ctx.db.delete(l._id);

//     // 2) Delete all expenses and their splits
//     const expenses = await ctx.db
//       .query("expenses")
//       .withIndex("by_group", (q) => q.eq("groupId", groupId))
//       .collect();

//     for (const e of expenses) {
//       const splits = await ctx.db
//         .query("splits")
//         .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
//         .collect();
//       for (const s of splits) await ctx.db.delete(s._id);
//       await ctx.db.delete(e._id);
//     }

//     // 3) Finally, delete the group
//     await ctx.db.delete(groupId);
//   },
// });

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";


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

function normalizeId(userId) {
  return userId.split("|").pop();
}

export const create = mutation({
  args: { name: v.string(), initialContactIds: v.array(v.id("contacts"))},
  handler: async (ctx, { name , initialContactIds}) => {
    const ident = await ctx.auth.getUserIdentity();
    if (!ident) throw new Error("Not authenticated");

    const trimmedName = name.trim();
    const ownerId = ident.subject;

    // check if a group with this name already exists
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_owner_name", (q) =>
        q.eq("ownerId", ownerId).eq("name", trimmedName)
      )
      .first();

    if (existing) {
      return { success: false, message: `You already have a group with this name. Try a different one!` };
      
      //throw new Error(`You already have a group called "${trimmedName}"`);
    }

    if (initialContactIds.length === 0) {
        return { success: false, message: `Please select at least one contact for the group.` };
    }

    const groupId = await ctx.db.insert("groups", {
      ownerId,
      name,
      createdAt: Date.now(),
      conversationId: undefined,
    });


    // const currentUserId = normalizeId(ident.subject); // or whatever matches contactId's format
    // const filteredContactIds = initialContactIds.filter(id => id !== currentUserId);
    const myContacts = await ctx.db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", ident.subject))
      .collect();
    
    const myContactIds = myContacts.map(c => c._id);
    const allPotentialContactIds = Array.from(new Set([...myContactIds, ...initialContactIds]));
    const potentialContacts = (await Promise.all(
        allPotentialContactIds.map(id => ctx.db.get(id))
    )).filter(Boolean);

    const uniqueContacts = new Map(); // Key: clerkUserId (or contact._id for non-users)
    for (const contact of potentialContacts) {
        // Use clerkUserId for deduplication if present, otherwise use the contact's _id
        const key = contact.clerkUserId || contact._id;
        
        // Only keep the first contact found for a given user/contact key
        if (!uniqueContacts.has(key)) {
            uniqueContacts.set(key, contact);
        }
    } 
    const finalContactIds = Array.from(uniqueContacts.values()).map(c => c._id);
    for (const contactId of finalContactIds) {
        await ctx.db.insert("groupMembers", { groupId, contactId });
    }

    const ownerChatInfo = { 
      id: ident.tokenIdentifier, 
      name: ident.name ?? ident.emailAddress 
    };

    const contactChatInfo = (await Promise.all(
        finalContactIds.map(async (contactId) => {
            const contact = await ctx.db.get(contactId);
            if (contact) {
                // Insert the group member link using the REAL groupId
                // await ctx.db.insert("groupMembers", { groupId, contactId });
                const memberIdForChat = contact.clerkUserId || contact._id;
                // Return data for the chat creation
                return { 
                    id: memberIdForChat, 
                    name: contact.name 
                };
            }
            return null;
        })
    )).filter(Boolean);
    const ownerSubject = ident.subject; // e.g., "user_XYZ"
    const filteredContactChatInfo = contactChatInfo.filter(
      m => m.id !== ownerSubject && m.id !== ownerChatInfo.id
    );
    let allChatMembers = [ownerChatInfo, ...filteredContactChatInfo];
    const uniqueChatMembers = Array.from(new Map(allChatMembers.map(m => [m.id, m])).values());

    
    const { conversationId } = await ctx.runMutation(internal.messages.internalCreateGroupChat, {
        groupName: trimmedName,
        memberInfo: uniqueChatMembers,
    });

    await ctx.db.patch(groupId, { conversationId });

    
    return { success: true, id: groupId };
    
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