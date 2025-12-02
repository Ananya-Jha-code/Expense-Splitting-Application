"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

export default function GroupsPage() {
  const groups = useQuery(api.groups.list);
  const create = useMutation(api.groups.create);
  const removeGroup = useMutation(api.groups.remove);
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const [name, setName] = React.useState("");
  const [error, setError] = React.useState(""); // for modal message

  const isLoading = groups === undefined;

  async function onCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    // const id = await create({ name: name.trim() });
    // setName("");
    try {
      const result = await create({ name: name.trim() });

      if (!result?.success) {
        setError(result?.message || "Failed to create group.");
        return;
      }

      setName("");
    } catch {
      // fallback just in case something unexpected happens
      setError("Something went wrong. Please try again.");
    }
    // optional: navigate to group detail
    // router.push(`/groups/${id}`);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await removeGroup({ groupId: deleteTarget.id });
      setDeleteTarget(null);
    } catch (e) {
      setError(e.message || "Failed to delete group");
      setDeleteTarget(null);
    }
  }

  return (
    <main className="min-h-screen pt-20 mx-auto max-w-2xl p-6 space-y-6">
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
                  <div className="text-sm text-gray-500">{g.memberCount ?? 0} members</div>
                </div>
              
                <div className="flex items-center gap-4">
                  <Link className="underline" href={`/groups/${encodeURIComponent(g.name)}`}>
                    Open
                  </Link>
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() =>
                        setDeleteTarget({ id: g._id, name: g.name })
                      }
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
      {error && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Error</h2>
            <p className="text-gray-700">{error}</p>
            <button
              onClick={() => setError("")}
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">
              Delete Group?
            </h2>
            <p className="text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget.name}</span>? <br />
              This will remove all members, expenses, and splits.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
