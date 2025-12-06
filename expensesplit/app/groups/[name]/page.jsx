"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function GroupDetailPage() {
  const { name } = useParams();               // group name from URL
  const group = useQuery(api.groups.getByName, { name });
  const groupId = group?._id;
  const myContactId = useQuery(api.contacts.getMyContactId);
  console.log("Current User's Contact ID/Name:", myContactId);

  const shouldFetch = Boolean(groupId);
  const contacts = useQuery(api.contacts.list);


  const members = useQuery(
    api.groups.members,
    shouldFetch ? { groupId } : "skip"
  );
  const expenses = useQuery(
    api.expenses.listByGroup,
    shouldFetch ? { groupId } : "skip"
  );
  const balances = useQuery(
    api.expenses.balances,
    shouldFetch ? { groupId } : "skip"
  );
  const settlements = useQuery(
    api.expenses.settlements,
    shouldFetch ? { groupId } : "skip"
  );
  const myContacts = useQuery(api.contacts.list);

  const addMember = useMutation(api.groups.addMember);
  const createEqual = useMutation(api.expenses.createEqualSplit);
  const createCustom = useMutation(api.expenses.createCustomSplit);
  const recordSettlement = useMutation(api.expenses.recordSettlement);
  const [authError, setAuthError] = React.useState(null);
  const [selectedContactId, setSelectedContactId] = React.useState("");

  const [mode, setMode] = React.useState("equal"); // "equal" | "custom"
  const [desc, setDesc] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [customDesc, setCustomDesc] = React.useState("");
  const [customShares, setCustomShares] = React.useState([]);

  const loadingExpenses = expenses === undefined;
  const loadingBalances = balances === undefined;

  // when members load, initialize one share row per member
  React.useEffect(() => {
    if (members) {
      setCustomShares(
        members.map((m) => ({
          contactId: m._id ?? m.contactId ?? m.id,
          share: 0,
        }))
      );
    }
  }, [members]);

  if (!group) {
    return (
      <main className="p-6 text-gray-500">
        Loading group details...
      </main>
    );
  }

  if (group === null) {
    return (
      <main className="p-6 text-red-500">
        Group not found.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">{group.name}</h1>

      {/* Expenses */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Expenses</h2>

        {/* Toggle equal/custom */}
        <div className="flex gap-2">
          <button
            className={`border rounded px-3 py-1 ${
              mode === "equal" ? "bg-black text-white" : ""
            }`}
            type="button"
            onClick={() => setMode("equal")}
          >
            Equal split
          </button>
          <button
            className={`border rounded px-3 py-1 ${
              mode === "custom" ? "bg-black text-white" : ""
            }`}
            type="button"
            onClick={() => setMode("custom")}
          >
            Custom split
          </button>
        </div>

        {mode === "equal" ? (
          // ---------- Equal split ----------
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const total = Number(amount);
              if (!desc.trim() || !isFinite(total) || total <= 0) return;

              await createEqual({
                groupId,
                description: desc.trim(),
                amount: total,
              });

              setDesc("");
              setAmount("");
            }}
            className="flex gap-2"
          >
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2 w-32"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="border rounded px-4 py-2">
              Add equal split
            </button>
          </form>
        ) : (
          // ---------- Custom split ----------
          <div className="space-y-3">
            <div className="grid gap-2">
              {(members ?? []).map((m) => {
                const idForRow = m._id ?? m.contactId ?? m.id;
                const share =
                  customShares.find((s) => s.contactId === idForRow)
                    ?.share ?? 0;

                return (
                  <div
                    key={idForRow}
                    className="flex items-center gap-3"
                  >
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
                            s.contactId === idForRow
                              ? {
                                  ...s,
                                  share: isFinite(v) ? v : 0,
                                }
                              : s
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
                  groupId,
                  description: customDesc.trim(),
                  shares: cleaned,
                });

                setCustomDesc("");
                setCustomShares(
                  (members ?? []).map((m) => ({
                    contactId: m._id ?? m.contactId ?? m.id,
                    share: 0,
                  }))
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
                {customShares
                  .reduce(
                    (sum, s) =>
                      sum + (Number.isFinite(s.share) ? s.share : 0),
                    0
                  )
                  .toFixed(2)}
              </div>
              <button className="border rounded px-4 py-2">
                Add custom split
              </button>
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
                  <div className="text-sm text-gray-500">
                    ${e.amount.toFixed(2)}
                  </div>
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
          ) : !balances || balances.length === 0 ? (
            <div className="p-3 text-gray-500">No balances yet.</div>
          ) : (
            <ul className="divide-y">
              {balances.map((b) => {
                const net = b.net ?? 0;
                if (Math.abs(net) < 0.01) {
                  return (
                    <li
                      key={b.contactId}
                      className="p-3 flex justify-between items-center"
                    >
                      <span>{b.name}</span>
                      <span className="text-gray-500 text-sm">
                        settled
                      </span>
                    </li>
                  );
                }

                const isDebtor = net > 0;
                const amountText = Math.abs(net).toFixed(2);

                return (
                  <li
                    key={b.contactId}
                    className="p-3 flex justify-between items-center"
                  >
                    <span>{b.name}</span>
                    <span className="text-sm">
                      <span className="font-medium">
                        {isDebtor ? "owes" : "is owed"}
                      </span>{" "}
                      <span className="font-mono">
                        ${amountText}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Suggested automatic settlements */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Suggested settlements
        </h2>

        {settlements === undefined && (
          <div className="p-3 text-gray-500 border rounded">
            Loading settlements...
          </div>
        )}

        {settlements && settlements.length === 0 && (
          <div className="p-3 text-green-600 border rounded">
            Everyone is fully settled 🎉
          </div>
        )}

        {settlements && settlements.length > 0 && (
          <div className="rounded border">
            <ul className="divide-y text-sm">
              {settlements.map((s, idx) => {
                
                let isAuthorized = false;

                if (myContactId && contacts) {
                  // Get the current user's clerkUserId from their own contact
                  const myContact = contacts.find(c => c._id === myContactId);
                  
                  // console.log('Authorization check:', {
                  //     settlementIndex: idx,
                  //     fromName: s.fromName,
                  //     toName: s.toName,
                  //     myClerkUserId: myContact?.clerkUserId,
                  //     fromClerkUserId: s.fromClerkUserId,
                  //     toClerkUserId: s.toClerkUserId,
                  //     isDebtor: myContact?.clerkUserId === s.fromClerkUserId,
                  //     isCreditor: myContact?.clerkUserId === s.toClerkUserId,
                  // });
                  
                  if (myContact) {
                      // Show button if current user is EITHER the debtor OR the creditor
                      const isDebtor = (myContact.clerkUserId === s.fromClerkUserId);
                      const isCreditor = (myContact.clerkUserId === s.toClerkUserId);
                      isAuthorized = isDebtor || isCreditor;
                  }
                  
                  console.log('isAuthorized:', isAuthorized);
                }


                return (
                  <li
                    key={idx}
                    className="p-3 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <span>
                        <span className="font-medium">{s.fromName}</span> must pay {" "}
                        <span className="font-medium">{s.toName}</span>
                      </span>
                      <span className="font-mono ml-2">${s.amount.toFixed(2)}</span>
                    </div>
                    
                    {/* CONDITIONAL RENDERING: Button ONLY appears if isAuthorized is true */}
                    {isAuthorized ? (
                      <button
                        type="button"
                        className="ml-4 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        onClick={async () => {
                          if (!groupId) return;
                          try {
                            await recordSettlement({
                              groupId,
                              fromId: s.fromId,
                              toId: s.toId,
                              amount: s.amount,
                            });
                          } catch (error) {
                            console.error("Settlement failed:", error);
                            alert(`Failed to record settlement: ${error.message}`);   
                          }
                        }}
                      >
                        Settle
                      </button>
                    ) : null} 
                  </li>
                );
              })}
            </ul>
          </div>
        )}


      </section>

      {authError && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">
              Authorization Error
            </h2>
            <p className="text-gray-700">
              {authError}
            </p>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setAuthError(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}