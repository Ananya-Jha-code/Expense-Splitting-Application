import { query } from "./_generated/server";
import { v } from "convex/values";

// Упрощённый баланс: считаем, сколько заплатил ты и сколько заплатили не ты.
// Net = youPaid - othersPaid. You are owed = max(Net, 0), You owe = max(-Net, 0).
export const balances = query({
  args: { me: v.string() }, // Clerk user.id
  handler: async ({ db }, { me }) => {
    const all = await db.query("expenses").collect();
    let youPaid = 0, othersPaid = 0;

    for (const e of all) {
      if (e.payerToken === me) youPaid += e.amount;
      else othersPaid += e.amount;
    }

    const net = youPaid - othersPaid;
    return {
      youOwe: Math.max(-net, 0),
      youAreOwed: Math.max(net, 0),
      youPaid,
      othersPaid,
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
  return [...map.entries()].map(([name, value]) => ({ name, value }));
});

export const getSummary = query(async ({ db }) => {
  const users = await db.query("users").collect();
  return {
    totalUsers: users.length,
    recentUsers: users.slice(-5),
  };
});