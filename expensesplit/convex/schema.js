import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values";
export default defineSchema({
    users:defineTable({
        username: v.optional(v.string()),
        name:v.optional(v.string()),
        email:v.optional(v.string()),
        tokenIdentifier: v.string(),
        // imageUrl:v.optional(v.string())
    })
    .index("by_token",["tokenIdentifier"])
    .index("by_email",["email"])
    .index("by_username", ["username"])
    .searchIndex("search_name",{searchField:"name"})
    .searchIndex("search_email",{searchField:"email"})
    .searchIndex("search_username",{searchField:"username"}),


    contacts: defineTable({
      ownerId: v.string(),
      name: v.string(),
      email: v.optional(v.string()),
      emailLower: v.optional(v.string()),
      phone: v.optional(v.string()),
      clerkUserId: v.optional(v.string()),
      createdAt: v.number(),
      hidden: v.optional(v.boolean()),
    })
    .index("by_owner", ["ownerId"])
    .index("by_clerkUserId", ["clerkUserId"]),

    
    
    groups: defineTable({
      ownerId: v.string(),       
      name: v.string(),
      createdAt: v.number(),
      conversationId: v.optional(v.id("conversations")),
    }).index("by_owner", ["ownerId"])
    .index("by_owner_name", ["ownerId", "name"]),
  
    groupMembers: defineTable({
      groupId: v.id("groups"),
      contactId: v.id("contacts"),
    }).index("by_group", ["groupId"])
      .index("by_contact", ["contactId"]),
  
    expenses: defineTable({
      groupId: v.id("groups"),
      createdBy: v.string(),    
      description: v.string(),
      amount: v.number(),        
      createdAt: v.number(),
    }).index("by_group", ["groupId"]),
  
    splits: defineTable({
      expenseId: v.id("expenses"),
      contactId: v.id("contacts"),
      share: v.number(),          
    }).index("by_expense", ["expenseId"]),

    conversations: defineTable({
      isGroup: v.boolean(),
      name: v.optional(v.string()),
      lastMessageSenderId: v.optional(v.string()), 

    }),

    conversationMembers: defineTable({
      conversationId: v.id("conversations"), 
      memberId: v.string(), 
      memberName: v.string(), 
      deleted: v.boolean(), 
      lastReadTime: v.number(),
    })
  // Index to quickly find all conversations for a single user
    .index("by_member", ["memberId"])
  // Index to find all members of a specific conversation
    .index("by_conversation", ["conversationId"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.string(),
      text: v.string(),
      createdAt: v.number(),
    })
      .index("by_conversation", ["conversationId", "createdAt"])
    
});