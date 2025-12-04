import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";


// Normalize user ID
function normalizeId(userId) {
  return userId.split("|").pop();
}

// List all convos for logged in user by checking conversationMembers table in convex

export const listConversations = query({
  args: {},
  handler: async ({ db, auth }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.tokenIdentifier;
    const normalizedUserId = normalizeId(userId);

    // find all conversation memberships for the current user that are not deleted (on their end)
    const memberships = await db
      .query("conversationMembers")
      .withIndex("by_member", (q) => q.eq("memberId", normalizedUserId))
      .filter((q) => q.eq(q.field("deleted"), false))
      .order("desc") // ordering by membership is not ideal for "latest message" FIX
      .collect();

    const data = [];

    for (const membership of memberships) {
      const convo = await db.get(membership.conversationId);
      if (!convo) continue; // safety check

      // display name
      let displayName;
      
      if (convo.isGroup) {
        // For groups, use the stored name
        displayName = convo.name;
      } else {
        // For DMs, find the *other* member
        const otherMember = await db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
          .filter((q) => q.neq(q.field("memberId"), normalizedUserId))
          .first();

        displayName = otherMember?.memberName;
      }
      
      // 3. get latest msg for preview in convo list
      const lastMessage = await db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", convo._id)
        )
        .order("desc")
        .first();

      // 4. unread status
      // check if the last message was sent by someone other than the current user
      // AND if  conversation has a last message sender ID set.
      const lastMessageTime = lastMessage?.createdAt ?? 0;
      const isLastMessageFromMe = lastMessage?.senderId && lastMessage.senderId === userId;
      
      const hasUnread = 
        lastMessage !== null && 
        !isLastMessageFromMe && 
        membership.lastReadTime < lastMessageTime;
      
      data.push({
        _id: convo._id,
        // frontend only needs the display name, not user-specific fields
        name: displayName || "Unnamed Chat",
        lastMessage: lastMessage?.text ?? "",
        hasUnread: hasUnread,
        isGroup: convo.isGroup,
        // no longer need otherUser, as we support multiple users
      });
    }

    return data;
  }
});

// Create or return an existing DM (i.e. isGroup: false) between two users.
export const startConversation = mutation({
  args: {
    otherUserId: v.string(), // this is full clerk ID
    otherUserName: v.string(),
  },
  handler: async ({ db, auth }, { otherUserId, otherUserName }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.tokenIdentifier;
    const normalizedUserId = normalizeId(userId);
    const normalizedOtherUserId = normalizeId(otherUserId);
    
    if (normalizedUserId === normalizedOtherUserId) {
      throw new Error("You cannot message yourself.");
    }

    // check for existing DM (Note: Checking for existing DMs is complex with the new schema index, 
    // but the simplest approach is to always create a new one unless you can guarantee unique indexing.)
    // For simplicity of refactoring, we'll focus on creation and trust the frontend logic.

    // create the new convo document
    const conversationId = await db.insert("conversations", {
      isGroup: false,
      lastMessageSenderId: undefined,
    });

    // create conversationMember entries for both users
    const myName = identity.name ?? identity.emailAddress;
    const now = Date.now();

    await db.insert("conversationMembers", {
      conversationId: conversationId,
      memberId: normalizedUserId,
      memberName: myName,
      deleted: false,
      lastReadTime: now,
    });
    
    await db.insert("conversationMembers", {
      conversationId: conversationId,
      memberId: normalizedOtherUserId,
      memberName: otherUserName,
      deleted: false,
      lastReadTime: now,
    });

    return { conversationId };
  }
});

// group chat general format



// // Creates new GC  w/ multiple members.
// export const createGroup = mutation({
//   args: {
//     groupName: v.string(),
//     memberIds: v.array(v.object({ id: v.string(), name: v.string() })), // arr of { id: ClerkID, name: string }
//   },
//   handler: async ({ db, auth }, { groupName, memberIds }) => {
//     const identity = await auth.getUserIdentity();
//     if (!identity) throw new Error("Not authenticated");

//     const userId = identity.tokenIdentifier;
//     const normalizedUserId = normalizeId(userId);
//     const now = Date.now();

//     // Ensure current user is in the list
//     if (!memberIds.some(m => normalizeId(m.id) === normalizedUserId)) {
//       memberIds.push({ 
//         id: userId, 
//         name: identity.name ?? identity.emailAddress 
//       });
//     }

//     if (memberIds.length < 2) {
//       throw new Error("A group must have at least two members.");
//     }
    
//     // create new convo document
//     const conversationId = await db.insert("conversations", {
//       isGroup: true,
//       name: groupName,
//       lastMessageSenderId: undefined,
//     });

//     // create conversationMember entries for all members
//     for (const member of memberIds) {
//       await db.insert("conversationMembers", {
//         conversationId: conversationId,
//         memberId: normalizeId(member.id),
//         memberName: member.name,
//         deleted: false,
//         lastReadTime: now,
//       });
//     }

//     return { conversationId };
//   }
// });


export const internalCreateGroupChat = internalMutation({
    args: {
        groupName: v.string(),
        // Requires an array of full user info for chat members
        memberInfo: v.array(v.object({ 
            id: v.string(), // Full Clerk ID
            name: v.string() 
        })),
   },
    handler: async ({ db }, { groupName, memberInfo }) => {
        const now = Date.now();
    
        if (memberInfo.length < 2) {
            throw new Error("A group chat must have at least two members.");
        }
    // create new convo document
        const conversationId = await db.insert("conversations", {
            isGroup: true,
            name: groupName,
            lastMessageSenderId: undefined,
        });
    // create conversationMember entries for all members
        for (const member of memberInfo) {
            await db.insert("conversationMembers", {
                conversationId: conversationId,
                memberId: normalizeId(member.id),
                memberName: member.name,
                deleted: false,
                lastReadTime: now,
            });
        }

        return { conversationId };
    }
});


// Public mutation for your messages page (to manually create a chat).
// This wrapper handles auth and calls the internal function.
export const createGroup = mutation({
    args: {
        groupName: v.string(),
        memberIds: v.array(v.object({ id: v.string(), name: v.string() })), // arr of { id: ClerkID, name: string }
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
    
        // Ensure current user is in the memberInfo array being passed to the internal function
        let memberInfo = args.memberIds;
        const currentUserId = identity.tokenIdentifier;
        if (!memberInfo.some(m => m.id === currentUserId)) {
            memberInfo = [
                ...memberInfo,
                { 
                    id: currentUserId, 
                    name: identity.name ?? identity.emailAddress 
                }
            ];
        }
    
    // Call the internal core creation function
        return ctx.runMutation(internal.messages.internalCreateGroupChat, {
            groupName: args.groupName,
            memberInfo: memberInfo,
        });
    }
});


export const getMessages = query({
  args: {
    conversationId: v.id("conversations")
  },
  handler: async ({ db, auth }, { conversationId }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];

    const normalizedUserId = normalizeId(identity.tokenIdentifier);

    // authorization check: ensure user is a member of the convo
    const isMember = await db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.eq(q.field("memberId"), normalizedUserId))
      .first();

    if (!isMember || isMember.deleted) return [];

    const messages = await db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("asc", { indexField: "createdAt" })
      .collect();

    const augmentedMessages = await Promise.all(
        messages.map(async (m) => {
        const normalizedSenderId = normalizeId(m.senderId); 

        const senderMembership = await db
            .query("conversationMembers")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.eq(q.field("memberId"), normalizedSenderId))
             .first();
        return {
            ...m,
            senderName: senderMembership?.memberName || "Unknown User",
        };
      })
    );

    return augmentedMessages;
  }
});


export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string()
  },
  handler: async ({ db, auth }, { conversationId, text }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.tokenIdentifier;
    const normalizedUserId = normalizeId(userId);

    // must be an active member
    const membership = await db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.eq(q.field("memberId"), normalizedUserId))
      .first();
      
    if (!membership || membership.deleted) {
      throw new Error("Not authorized to send messages in this conversation.");
    }

    // insert msg
    await db.insert("messages", {
      conversationId,
      senderId: userId,
      text,
      createdAt: Date.now()
    });

    // update conversation to mark who sent the last message
    await db.patch(conversationId, {
      lastMessageSenderId: userId
    });

    // update lastReadTime for the sender
    await db.patch(membership._id, {
      lastReadTime: Date.now()
    });


    return { success: true };
  }
});


// Soft-deletes a conversation for the current user. Hard-deletes if all members have soft-deleted it
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async ({ db, auth }, { conversationId }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const normalizedUserId = normalizeId(identity.tokenIdentifier);

    const membership = await db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .filter((q) => q.eq(q.field("memberId"), normalizedUserId))
        .first();

    if (!membership) {
        throw new Error("Not a member of this conversation.");
    }
    
    // soft-delete for the current user
    await db.patch(membership._id, { deleted: true });
    
    // check all other members
    const allMembers = await db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    // check if ALL memberships are now marked as deleted
    const allDeleted = allMembers.every(m => m.deleted);
    
    if (allDeleted) {
      // Hard Delete
      
      // delete all messages
      const messages = await db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId)
        )
        .collect();

      for (const message of messages) {
        await db.delete(message._id);
      }
      
      // delete all conversationMembers records
      for (const member of allMembers) {
        await db.delete(member._id);
      }

      // delete the conversation itself
      await db.delete(conversationId);
    }
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async ({ db, auth }, { conversationId }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.tokenIdentifier;
    const normalizedUserId = normalizeId(userId);

    const [convo, membership] = await Promise.all([
        db.get(conversationId),
        db
            .query("conversationMembers")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.eq(q.field("memberId"), normalizedUserId))
            .first(),
    ]);

    if (!convo || !membership) {
        throw new Error("Not authorized to mark this conversation as read");
    }

    // If the conversation already has no unread indicator, we're done.
    if (convo.lastMessageSenderId === undefined) {
        return { success: true };
    }

    // 2. Update the current user's membership (marks their view as read)
    const now = Date.now();
    await db.patch(membership._id, {
        lastReadTime: now
    });

    // If the user who sent the last message is the one reading it, 
    // it should NOT clear the unread status for others. We just update their lastReadTime.
    if (convo.lastMessageSenderId === userId) {
        return { success: true };
    }

    // 3. Check if ALL other active members have now read the last message.
    // Get the last message to find its timestamp. 
    const lastMessage = await db
        .query("messages")
        .withIndex("by_conversation", (q) =>
         q.eq("conversationId", conversationId)
        )
        .order("desc")
        .first();

    // Safety check: if there's an unread status but no messages, something is wrong. Exit.
    if (!lastMessage) {
        await db.patch(conversationId, { lastMessageSenderId: undefined });
        return { success: true };
    }

    // Get all other members in the conversation, excluding the sender of the last message.
    const allOtherMembers = await db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .filter((q) => q.eq(q.field("deleted"), false)) // Only check active members
        .filter((q) => q.neq(q.field("memberId"), normalizeId(convo.lastMessageSenderId))) // Exclude the sender
        .collect();

    // Check if ALL of these members have a lastReadTime greater than or equal to the last message's time.
    const allOthersHaveRead = allOtherMembers.every(m => m.lastReadTime >= lastMessage.createdAt);

    // 4. If everyone else has read it, clear the unread indicator for the conversation itself.
    if (allOthersHaveRead) {
        await db.patch(conversationId, {
            lastMessageSenderId: undefined
        });
    }


    return { success: true };
  }
});