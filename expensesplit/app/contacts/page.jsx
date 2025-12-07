"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import UserSearchBar from "@/components/UserSearchBar";
import { Button } from "@/components/ui/button";

export default function ContactsPage() {
  const contacts = useQuery(api.contacts.list);
  const ensureOwnContact = useMutation(api.contacts.ensureOwnContact);
  const createContact = useMutation(api.contacts._createAfterCheck);
  const remove = useMutation(api.contacts.remove);
  const { user } = useUser();

  const [selectedUser, setSelectedUser] = React.useState(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const isLoading = contacts === undefined;

  // On user and contacts load, ensure self contact exists
  React.useEffect(() => {
    if (!user || !contacts) return;
    const hasSelfContact = contacts.some((c) => c.clerkUserId === user.id);
    if (!hasSelfContact) {
      ensureOwnContact().catch((err) => {
        console.error("Failed to create self contact:", err);
      });
    }
  }, [user, contacts, ensureOwnContact]);

  async function onAdd() {
    if (!selectedUser) return setError("Select a user first.");
    setPending(true);

    try {
      const result = await createContact({
        ownerId: user?.id,
        name: selectedUser.name || "Unnamed User",
        email: selectedUser.email || "",
        phone: undefined,
        clerkUserId: selectedUser.tokenIdentifier,
      });

      if (result?.success === false) {
        setError(result?.message || "Failed to add contact.");
      } else {
        setSelectedUser(null);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong — please try again later.");
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove({ id: deleteTarget.id });
      setDeleteTarget(null);
    } catch (e) {
      setError(e.message || "Failed to delete contact");
      setDeleteTarget(null);
    }
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
        <UserSearchBar onSelect={(u) => setSelectedUser(u)} />

        {selectedUser && (
          <div className="p-4 mt-3 border rounded bg-pink-50">
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-sm text-gray-700">{selectedUser.email}</p>
            {selectedUser.username && (
              <p className="text-sm text-gray-500">@{selectedUser.username}</p>
            )}
            <Button
              onClick={onAdd}
              disabled={pending}
              className="mt-3 bg-pink-500 hover:bg-pink-600 text-white"
            >
              {pending ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        )}

        <div className="rounded-lg border mt-6">
          {isLoading ? (
            <div className="p-4 text-gray-500">Loading…</div>
          ) : contacts?.length === 0 ? (
            <div className="p-4 text-gray-500">No contacts yet.</div>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => {
                const isSelf = c.clerkUserId === user.id;
                return (
                  <li key={c._id} className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">{c.email}</div>
                      {isSelf && (
                        <div className="text-xs text-gray-400 italic">You</div>
                      )}
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => setDeleteTarget({ id: c._id, name: c.name })}
                        className="text-red-600 underline"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                );
              })}
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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
            <h2 className="text-lg font-semibold text-red-600">Delete Contact?</h2>
            <p className="text-gray-700">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget.name}</span>?
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