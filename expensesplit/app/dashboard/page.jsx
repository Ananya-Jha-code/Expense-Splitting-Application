
"use client";

import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

function DashboardInner() {
  const categories = [
    "Food & Dining",
    "Transportation",
    "Utilities & Bills",
    "Housing & Rent",
    "Entertainment & Leisure",
    "Other",
  ];
  const { user } = useUser();
  const me = user?.id ?? "";

  // Данные для карточек / графиков / списка
  const balances = useQuery(api.dashboard.balances, { me }) ?? { youOwe: 0, youAreOwed: 0, youPaid: 0, othersPaid: 0 };
  const perMonth = useQuery(api.dashboard.byMonth) ?? [];
  const perCategory = useQuery(api.dashboard.byCategory) ?? [];
  const recent = useQuery(api.expenses.recent, { limit: 5 }) ?? [];
  
  const categoryColors = {
    "Food & Dining": "#FF6384",
    "Transportation": "#36A2EB",
    "Utilities & Bills": "#FFCE56",
    "Housing & Rent": "#4BC0C0",
    "Entertainment & Leisure": "#9966FF",
    "Other": "#FF9F40",
  };
  // Форма добавления расхода
  const addExpense = useMutation(api.expenses.add);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const onAdd = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!title || !value || !category || !me) return;
    await addExpense({
      title,
      amount: value,
      category,
      payerToken: me,
      currency: "USD",
    });
    setTitle("");
    setAmount("");
    setCategory("");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Welcome, {user?.firstName || "User"} 👋
      </h1>

      {/* Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="You paid" value={`$${balances.youPaid.toFixed(2)}`} />
        <Card title="Others paid" value={`$${balances.othersPaid.toFixed(2)}`} />
        <Card title="You owe" value={`$${balances.youOwe.toFixed(2)}`} />
        <Card title="You are owed" value={`$${balances.youAreOwed.toFixed(2)}`} />
      </div>

      {/* Форма добавления */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-medium mb-3">Add expense</h2>
        <form onSubmit={onAdd} className="flex flex-col md:flex-row gap-3">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="border rounded px-3 py-2 w-40"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 w-48"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="border rounded px-4 py-2 bg-black text-white">
            Add
          </button>
        </form>
      </section>

      {/* Линейный график по месяцам */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-medium mb-3">Spending by month</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Пай-чарт + последние расходы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-medium mb-3">By category</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={perCategory} outerRadius={100} label>
                  {perCategory.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={categoryColors[entry.category] ?? "#ccc"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-medium mb-3">Recent expenses</h2>
          <ul className="divide-y">
            {recent.map((e) => (
              <li key={e._id} className="py-2 flex justify-between items-center">
                <div className="flex flex-col overflow-hidden">
                  {/* Show Description/Title */}
                  <span className="font-medium truncate">{e.title}</span>
                  {/* Show Group Name in smaller grey text */}
                  <span className="text-xs text-gray-500 truncate">
                    {e.groupName}
                  </span>
                </div>
                <span className="font-semibold ml-2">
                  ${e.amount.toFixed?.(2) ?? e.amount}
                </span>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="py-2 text-neutral-500">No expenses yet</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <SignedOut><RedirectToSignIn /></SignedOut>
      <SignedIn>
        <main className="p-6 space y-6">
          <DashboardInner />
        </main>
      </SignedIn>
    </>
  );
}