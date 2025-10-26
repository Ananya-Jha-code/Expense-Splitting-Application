"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function GroupDetailPage() {
  const { id } = useParams(); // groupId
  const members = useQuery(api.groups.members, { groupId: id });
  const expenses = useQuery(api.expenses.listByGroup, { groupId: id });
  const balances = useQuery(api.expenses.balances, { groupId: id });
  const myContacts = useQuery(api.contacts.list); 
  const addMember = useMutation(api.groups.addMember);
  const removeMember = useMutation(api.groups.removeMember);
  const createEqual = useMutation(api.expenses.createEqualSplit);
  

  // For adding member: a simple input to paste a contactId (MVP)
  const [contactId, setContactId] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const loadingMembers = members === undefined;
  const loadingExpenses = expenses === undefined;
  const loadingBalances = balances === undefined;
  const [selectedContactId, setSelectedContactId] = React.useState("");
  const createCustom = useMutation(api.expenses.createCustomSplit);
  const [mode, setMode] = React.useState("equal"); // "equal" | "custom"
  const [customDesc, setCustomDesc] = React.useState("");
  const [customShares, setCustomShares] = React.useState([]);
  
  // when members load, initialize one share row per member
  React.useEffect(() => {
    if (members) {
      setCustomShares(
        members.map((m) => ({ contactId: m._id ?? m.contactId ?? m.id, share: 0 }))
      );
    }
  }, [members]);
  


  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Group</h1>

      {/* Members */}
      <form
  onSubmit={async (e) => {
    e.preventDefault();
    if (!selectedContactId) return;
    await addMember({ groupId: id, contactId: selectedContactId });
    setSelectedContactId("");
  }}
  className="flex gap-2"
>
  <select
    className="border rounded px-3 py-2 flex-1"
    value={selectedContactId}
    onChange={(e) => setSelectedContactId(e.target.value)}
  >
    <option value="">Select a contact…</option>
    {(myContacts ?? []).map((c) => (
      <option key={c._id} value={c._id}>
        {c.name}{c.email ? ` — ${c.email}` : ""}{c.phone ? ` — ${c.phone}` : ""}
      </option>
    ))}
  </select>
  <button className="border rounded px-4 py-2">Add</button>
</form>


      {/* Expenses */}
      <section className="space-y-3">
  <h2 className="text-xl font-semibold">Expenses</h2>

  {/* Toggle */}
  <div className="flex gap-2">
    <button
      className={`border rounded px-3 py-1 ${mode === "equal" ? "bg-black text-white" : ""}`}
      onClick={() => setMode("equal")}
      type="button"
    >
      Equal split
    </button>
    <button
      className={`border rounded px-3 py-1 ${mode === "custom" ? "bg-black text-white" : ""}`}
      onClick={() => setMode("custom")}
      type="button"
    >
      Custom split
    </button>
  </div>

  {mode === "equal" ? (
    // ---------- Equal split (your existing form) ----------
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const total = Number(amount);
        if (!desc.trim() || !isFinite(total) || total <= 0) return;
        await createEqual({ groupId: id, description: desc.trim(), amount: total });
        setDesc(""); setAmount("");
      }}
      className="flex gap-2"
    >
      <input className="border rounded px-3 py-2 flex-1" placeholder="Description"
             value={desc} onChange={(e) => setDesc(e.target.value)} />
      <input className="border rounded px-3 py-2 w-32" placeholder="Amount"
             value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="border rounded px-4 py-2">Add equal split</button>
    </form>
  ) : (
    // ---------- Custom split ----------
    <div className="space-y-3">
      <div className="grid gap-2">
        {(members ?? []).map((m, i) => {
          const idForRow = m._id ?? m.contactId ?? m.id;
          const share = customShares.find((s) => s.contactId === idForRow)?.share ?? 0;
          return (
            <div key={idForRow} className="flex items-center gap-3">
              <div className="w-48 truncate">{m.name}</div>
              <input
                type="number"
                step="0.01"
                className="border rounded px-2 py-1 w-40"
                placeholder="Amount"
                value={share}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCustomShares((prev) =>
                    prev.map((s) =>
                      s.contactId === idForRow ? { ...s, share: isFinite(v) ? v : 0 } : s
                    )
                  );
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Summary + submit */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const cleaned = customShares.filter((s) => s.share > 0);
          if (!customDesc.trim() || cleaned.length === 0) return;

          await createCustom({
            groupId: id,
            description: customDesc.trim(),
            shares: cleaned,
          });

          setCustomDesc("");
          setCustomShares(
            (members ?? []).map((m) => ({ contactId: m._id ?? m.contactId ?? m.id, share: 0 }))
          );
        }}
        className="flex gap-2 items-center"
      >
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Description"
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
        />
        <div className="text-sm text-gray-600 px-2">
          Total: $
          {customShares.reduce((sum, s) => sum + (Number.isFinite(s.share) ? s.share : 0), 0).toFixed(2)}
        </div>
        <button className="border rounded px-4 py-2">Add custom split</button>
      </form>
    </div>
  )}

  {/* Existing list of expenses */}
  <div className="rounded border">
    {loadingExpenses ? (
      <div className="p-3 text-gray-500">Loading…</div>
    ) : expenses?.length === 0 ? (
      <div className="p-3 text-gray-500">No expenses yet.</div>
    ) : (
      <ul className="divide-y">
        {expenses.map((e) => (
          <li key={e._id} className="p-3">
            <div className="font-medium">{e.description}</div>
            <div className="text-sm text-gray-500">${e.amount.toFixed(2)}</div>
          </li>
        ))}
      </ul>
    )}
  </div>
</section>


      {/* Balances */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Balances</h2>
        <div className="rounded border">
          {loadingBalances ? (
            <div className="p-3 text-gray-500">Loading…</div>
          ) : balances?.length === 0 ? (
            <div className="p-3 text-gray-500">No balances yet.</div>
          ) : (
            <ul className="divide-y">
              {balances.map(b => (
                <li key={b.contactId} className="p-3 flex justify-between">
                  <span>{b.name}</span>
                  <span>${(b.net ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
