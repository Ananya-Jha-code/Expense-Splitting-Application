"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useAction } from "convex/react";            

export default function ContactsPage() {
  const contacts = useQuery(api.contacts.list);
  const createChecked = useAction(api.contacts.createChecked); 
  const remove = useMutation(api.contacts.remove);
  const update = useMutation(api.contacts.update);

  const [form, setForm] = React.useState({ name: "", email: "", phone: "" });
  const [editing, setEditing] = React.useState(null); // contact _id
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(null);

  const isLoading = contacts === undefined;

  async function onAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
  
    const email = (form.email || "").trim();
    const phone = (form.phone || "").trim();
    const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  
    if (!email && !phone) {
      setError("Please enter either an email or phone number.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
  
    setPending(true);
    try {
      const result = await createChecked({
        name: form.name.trim(),
        email,
        phone: phone || undefined,
      });
      if (!result?.success) {
        setError(result?.message || "Failed to add contact.");
        return;
      }
      setForm({ name: "", email: "", phone: "" });
      setError(null);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong — please try again later.");

    } finally {
      setPending(false);
    }
  }

  function formatPhoneNumber(value) {
  // remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // ensure +1 prefix
    let formatted = "+1 ";
    if (digits.length > 1) {
      const area = digits.slice(1, 4);
      const prefix = digits.slice(4, 7);
      const line = digits.slice(7, 11);
      if (area) formatted += `(${area}`;
      if (area && area.length === 3) formatted += `) `;
      if (prefix) formatted += prefix;
      if (prefix && prefix.length === 3) formatted += "-";
      if (line) formatted += line;
    }

    return formatted.trim();
  }

  
  

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Contacts</h1>

      <SignedOut>
        <p className="text-sm text-gray-600">Please sign in to manage contacts.</p>
        <SignInButton>
          <button className="mt-2 rounded border px-3 py-1">Sign in</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        {/* Add form */}
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded-lg px-3 py-2" placeholder="Name *"
                 value={form.name} onChange={(e) => setForm(s => ({...s, name: e.target.value}))} required />
          <input className="border rounded-lg px-3 py-2" placeholder="Email"
                 value={form.email} onChange={(e) => setForm(s => ({...s, email: e.target.value}))} />
          <input className="border rounded-lg px-3 py-2" placeholder="Phone #"
                 value={form.phone} onChange={(e) => setForm(s => ({...s, phone:formatPhoneNumber(e.target.value)}))} />
          <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 border bg-black text-white disabled:opacity-60">
            {pending ? "Adding..." : "Add"}
          </button>
        </form>

        {/* List */}
        <div className="rounded-lg border">
          {isLoading ? (
            <div className="p-4 text-gray-500">Loading…</div>
          ) : contacts?.length === 0 ? (
            <div className="p-4 text-gray-500">No contacts yet.</div>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => (
                <li key={c._id} className="p-4 flex items-start justify-between gap-3">
                  {editing === c._id ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await update({
                          id: c._id,
                          name: form.name.trim(),
                          email: form.email?.trim() || undefined,
                          phone: form.phone?.trim() || undefined,
                        });
                        setEditing(null);
                      }}
                      className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2"
                    >
                      <input className="border rounded px-2 py-1" value={form.name}
                             onChange={(e) => setForm(s => ({...s, name: e.target.value}))} required />
                      <input className="border rounded px-2 py-1" value={form.email}
                             onChange={(e) => setForm(s => ({...s, email: e.target.value}))} />
                      <input className="border rounded px-2 py-1" value={form.phone}
                             onChange={(e) => setForm(s => ({...s, phone: e.target.value}))} />
                      <input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              className="border rounded-lg px-3 py-2"
                              placeholder="Email"
                              value={form.email}
                              onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button className="px-3 py-1 border rounded bg-black text-white">Save</button>
                        <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 border rounded">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-sm text-gray-500">
                          {[c.email, c.phone].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setForm({ name: c.name, email: c.email ?? "", phone: c.phone ?? "" });
                            setEditing(c._id);
                          }}
                          className="underline"
                        >
                          Edit
                        </button>
                        <button onClick={() => remove({ id: c._id })} className="text-red-600 underline">
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SignedIn>
      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80 text-center">
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
