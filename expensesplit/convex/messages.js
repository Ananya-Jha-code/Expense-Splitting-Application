import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all conversations for the logged-in user.
 */
export const listConversations = query({
  args: {},
  handler: async ({ db, auth }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];

    const userId = identity.tokenIdentifier;
    const normalizedUserId = userId.split("|").pop();

    const conversations = await db
      .query("conversations")
      .filter(q => q.or(
        q.eq(q.field("user1"), normalizedUserId),
        q.eq(q.field("user2"), normalizedUserId)
      ))
      .order("desc")
      .collect();

    const data = [];

    for (const convo of conversations) {

      // 💡 1. Determine which user the caller is
        const isUser1 = convo.user1 === normalizedUserId;
        
        // 💡 2. Check the soft-delete flag corresponding to the current user
        const userDeleted = isUser1 ? convo.user1Deleted : convo.user2Deleted;

        if (userDeleted) {
            // 💡 3. If the flag is true, skip this conversation for the current user's view
            continue; 
        }
      const otherId = convo.user1 === normalizedUserId ? convo.user2 : convo.user1;

      // Logic to determine the correct name to display
      let otherName = "Unknown";
      if (convo.user1 === normalizedUserId) {
        // If I am User 1, I want to see User 2's name
        otherName = convo.user2Name;
      } else {
        // If I am User 2, I want to see User 1's name
        otherName = convo.user1Name;
      }

      const lastMessage = await db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", convo._id)
        )
        .order("desc")
        .first();

      data.push({
        _id: convo._id,
        otherUser: {
          id: otherId,
          name: otherName || otherId.slice(-4) // Use the found name, fallback to ID only if empty
        },
        lastMessage: lastMessage?.text ?? "",
        hasUnread: convo.lastMessageSenderId && convo.lastMessageSenderId !== userId
      });
    }

    return data;
  }
});

/**
 * Create or return an existing conversation between two users.
 */
export const startConversation = mutation({
  args: {
    otherUserId: v.string(),
    otherUserName: v.string(), // <--- Add this argument
  },
  handler: async ({ db, auth }, { otherUserId, otherUserName }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.tokenIdentifier;

    const normalizedUserId = userId.split("|").pop(); 
    const normalizedOtherUserId = otherUserId.split("|").pop();

    if (normalizedUserId === normalizedOtherUserId) {
      throw new Error("You cannot message yourself.");
    }

    const existing = await db
      .query("conversations")
      .filter((q) =>
        q.or(
          q.and(q.eq(q.field("user1"), normalizedUserId), q.eq(q.field("user2"), normalizedOtherUserId)),
          q.and(q.eq(q.field("user1"), normalizedOtherUserId), q.eq(q.field("user2"), normalizedUserId))
        )
      )
      .first();

    if (existing) {
      return { conversationId: existing._id };
    }

    // Create new conversation with BOTH names saved
    const id = await db.insert("conversations", {
      user1: normalizedUserId,
      user2: normalizedOtherUserId,
      user1Name: identity.name ?? identity.emailAddress, // My Name
      user2Name: otherUserName, // <--- The name passed from frontend
      user1Deleted: false, 
      user2Deleted: false,
    });

    return { conversationId: id };
  }
});

// ... getMessages and sendMessage remain exactly the same ...
export const getMessages = query({
  args: {
    conversationId: v.id("conversations")
  },
  handler: async ({ db, auth }, { conversationId }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];

    const messages = await db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId)
      )
      .order("asc", { indexField: "createdAt" })
      .collect();

    return messages;
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
    const normalizedUserId = userId.split("|").pop();

    const convo = await db.get(conversationId);
    if (!convo) throw new Error("Conversation not found");

    if (convo.user1 !== normalizedUserId && convo.user2 !== normalizedUserId) {
      throw new Error("Not authorized");
    }

    await db.insert("messages", {
      conversationId,
      senderId: userId,
      text,
      createdAt: Date.now()
    });

    await db.patch(conversationId, {
        lastMessageSenderId: userId
    });

    return { success: true };
  }
});

/**
 * Delete a conversation and all its messages.
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async ({ db, auth }, { conversationId }) => {
    const identity = await auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.tokenIdentifier;
    const normalizedUserId = userId.split("|").pop();

    // 1. Check if conversation exists
    const convo = await db.get(conversationId);
    if (!convo) throw new Error("Conversation not found");

    // 2. Verify permission (must be one of the users)
    if (convo.user1 !== normalizedUserId && convo.user2 !== normalizedUserId) {
      throw new Error("Not authorized to delete this conversation");
    }

    // Determine which user the caller is
    const isUser1 = convo.user1 === normalizedUserId;

    // Check if the other user has already soft-deleted the conversation
    const otherUserDeleted = isUser1 ? convo.user2Deleted : convo.user1Deleted;

    if (otherUserDeleted) {
      // If the other user already deleted it, and I'm deleting it now,
      // we can perform the hard delete (delete all messages + the convo doc)

      // 1. Delete all messages associated with this conversation
      const messages = await db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId)
        )
        .collect();

      for (const message of messages) {
        await db.delete(message._id);
      }

      // 2. Delete the conversation itself
      await db.delete(conversationId);
      
    } else {
      // The other user has NOT deleted it yet, so we perform a soft delete:
      const fieldToUpdate = isUser1 ? "user1Deleted" : "user2Deleted";
      
      await db.patch(conversationId, { [fieldToUpdate]: true });
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
    const normalizedUserId = userId.split("|").pop();


    const convo = await db.get(conversationId);
    if (!convo) throw new Error("Conversation not found");

    if (convo.user1 !== normalizedUserId && convo.user2 !== normalizedUserId) {
      throw new Error("Not authorized to mark this conversation as read");
    }

    // Clear the lastMessageSenderId when user opens the conversation
    await db.patch(conversationId, {
      lastMessageSenderId: undefined
    });

    return { success: true };
  }
});