import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values";
export default defineSchema({
    users:defineTable({
        name:v.optional(v.string()),
        email:v.optional(v.string()),
        tokenIdentifier: v.string(),
        imageUrl:v.optional(v.string())
    })
    .index("by_token",["tokenIdentifier"])
    .index("by_email",["email"])
    .searchIndex("search_name",{searchField:"name"})
    .searchIndex("search_email",{searchField:"email"}),

    contacts: defineTable({
        ownerId: v.string(),        
        name: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        createdAt: v.number(),
      }).index("by_owner", ["ownerId"]),
    
      // --- new ---
      groups: defineTable({
        ownerId: v.string(),        // who created the group (Clerk subject)
        name: v.string(),
        createdAt: v.number(),
      }).index("by_owner", ["ownerId"]),
    
      groupMembers: defineTable({
        groupId: v.id("groups"),
        contactId: v.id("contacts"),
      }).index("by_group", ["groupId"])
        .index("by_contact", ["contactId"]),
    
      expenses: defineTable({
        groupId: v.id("groups"),
        createdBy: v.string(),      // Clerk subject
        description: v.string(),
        amount: v.number(),         // total amount
        createdAt: v.number(),
      }).index("by_group", ["groupId"]),
    
      splits: defineTable({
        expenseId: v.id("expenses"),
        contactId: v.id("contacts"),
        share: v.number(),          // amount charged to this contact
      }).index("by_expense", ["expenseId"]),
    
});