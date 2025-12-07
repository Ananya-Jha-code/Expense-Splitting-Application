import { query } from "./_generated/server";
import { v } from "convex/values";

// Упрощённый баланс: считаем, сколько заплатил ты и сколько заплатили не ты.
// Net = youPaid - othersPaid. You are owed = max(Net, 0), You owe = max(-Net, 0).
export const balances = query({
  args: { me: v.string() }, // Clerk user.id
  handler: async ({ db }, { me }) => {
    // 1. Get all contacts linked to this user (could be in multiple groups)
    const myContacts = await db
      .query("contacts")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", me))
      .collect();
    
    const myContactIds = new Set(myContacts.map((c) => c._id));

    // 2. Get all expenses
    const allExpenses = await db.query("expenses").collect();

    let youPaid = 0;
    let youShare = 0; 
    let totalSpentByGroup = 0; 

    // 3. Iterate expenses to find what YOU paid
    for (const e of allExpenses) {
      if (e.payerToken === me || e.createdBy === me) {
        youPaid += e.amount;
      }
      
      // Get splits for this expense
      const splits = await db
        .query("splits")
        .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
        .collect();

      // Find if I am in the splits
      for (const s of splits) {
        if (myContactIds.has(s.contactId)) {
          youShare += s.share;
        }
      }
    }

    const net = youPaid - youShare;

    return {
      youOwe: net < 0 ? Math.abs(net) : 0,
      youAreOwed: net > 0 ? net : 0,
      youPaid,
      othersPaid: 0, 
    };
  },
});

// Расходы по месяцам для линейного графика
export const byMonth = query(async ({ db }) => {
  const list = await db.query("expenses").collect();
  const map = new Map(); // "YYYY-MM" -> сумма

  for (const e of list) {
    const d = new Date(e._creationTime ?? Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + e.amount);
  }
  return [...map.entries()].sort().map(([month, total]) => ({ month, total }));
});

// Расходы по категориям для пай-чарта
export const byCategory = query(async ({ db }) => {
  const list = await db.query("expenses").collect();
  const map = new Map(); // категория -> сумма
  for (const e of list) {
    const cat = e.category ?? "Other";
    map.set(cat, (map.get(cat) ?? 0) + e.amount);
  }
  return [...map.entries()].map(([category, value]) => ({ category, name: category, value }));
});

export const getSummary = query(async ({ db }) => {
  const users = await db.query("users").collect();
  return {
    totalUsers: users.length,
    recentUsers: users.slice(-5),
  };
});