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
    }).index("by_owner", ["ownerId"]),
    
    
      groups: defineTable({
        ownerId: v.string(),       
        name: v.string(),
        createdAt: v.number(),
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

      messages: defineTable({
        groupId: v.id("groups"),
        senderId: v.string(),
        senderName: v.string(),
        text: v.string(),
        createdAt: v.number(),
      }).index("by_group_time", ["groupId", "createdAt"]),

    
});