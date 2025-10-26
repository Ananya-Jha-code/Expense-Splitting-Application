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

});