"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function GroupsPage() {
  const groups = useQuery(api.groups.list);
  const create = useMutation(api.groups.create);
  const removeGroup = useMutation(api.groups.remove);

  const [name, setName] = React.useState("");
  const isLoading = groups === undefined;

  async function onCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = await create({ name: name.trim() });
    setName("");
    // optional: navigate to group detail
    // router.push(`/groups/${id}`);
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Groups</h1>

      <SignedOut>
        <p>Please sign in to manage groups.</p>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <form onSubmit={onCreate} className="flex gap-2">
          <input className="border rounded px-3 py-2 flex-1"
                 placeholder="New group name"
                 value={name} onChange={e => setName(e.target.value)} />
          <button className="border rounded px-4 py-2 bg-black text-white">Create</button>
        </form>

        <div className="rounded border mt-4">
          {isLoading ? (
            <div className="p-4 text-gray-500">Loading…</div>
          ) : groups?.length === 0 ? (
            <div className="p-4 text-gray-500">No groups yet.</div>
          ) : (
            <ul className="divide-y">
              {groups.map(g => (
                <li key={g._id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-sm text-gray-500">{g.memberCount} members</div>
                </div>
              
                <div className="flex items-center gap-4">
                  <Link className="underline" href={`/groups/${g._id}`}>
                    Open
                  </Link>
                  <button
                    className="text-red-600 underline"
                    onClick={async () => {
                      if (!confirm(`Delete group "${g.name}"? This will remove members, expenses, and splits.`)) return;
                      try {
                        await removeGroup({ groupId: g._id });
                      } catch (e) {
                        alert(e.message || "Failed to delete group");
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
              
              ))}
            </ul>
          )}
        </div>
      </SignedIn>
    </main>
  );
}
