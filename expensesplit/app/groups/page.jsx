"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

export default function GroupsPage() {
  const groups = useQuery(api.groups.list);
  const allContacts = useQuery(api.contacts.list); // <-- needed for member picker
  const create = useMutation(api.groups.create);
  const removeGroup = useMutation(api.groups.remove);
  const { user } = useUser(); // get logged-in user info


  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [error, setError] = React.useState("");

  const [name, setName] = React.useState("");

  // Find the logged-in user's contact from allContacts, by matching clerkUserId with user.id
  const userContact = React.useMemo(() => {
    if (!allContacts || !user) return null;
    return allContacts.find((c) => c.clerkUserId === user.id);
  }, [allContacts, user]);

  const [selectedContactIds, setSelectedContactIds] = React.useState(() =>
    userContact ? [userContact._id] : []
  );

  React.useEffect(() => {
    if (userContact && !selectedContactIds.includes(userContact._id)) {
      setSelectedContactIds((ids) => [...ids, userContact._id]);
    }
  }, [userContact, selectedContactIds]);

  const isLoading = groups === undefined;

  const toggleContact = (contactId) => {
    if (userContact && contactId === userContact._id) return;

    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const isCreateDisabled =
    !name.trim() || selectedContactIds.length === 0;

  async function onCreate(e) {
    e.preventDefault();
    if (isCreateDisabled) return;

    try {
      const result = await create({
        name: name.trim(),
        initialContactIds: selectedContactIds,
      });

      if (!result?.success) {
        setError(result?.message || "Failed to create group.");
        return;
      }

      setName("");
      setSelectedContactIds([]);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    }
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
        <form
          onSubmit={onCreate}
          className="space-y-4 p-4 border rounded-lg bg-gray-50"
        >
          <h2 className="text-xl font-medium">Create New Group 💬</h2>

          {/* Group Name */}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Group Name</span>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="e.g., Hiking Buddies"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {/* Contact Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium block">Initial Members</span>
            <div className="max-h-40 overflow-y-auto border p-2 rounded bg-white">
              {allContacts === undefined ? (
                <p className="text-gray-500 text-sm">Loading contacts...</p>
              ) : allContacts.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No contacts found. Add some first!
                </p>
              ) : (
                // allContacts.map((contact) => (
                //   <div
                //     key={contact._id}
                //     className="flex items-center justify-between p-1 cursor-pointer hover:bg-gray-100"
                //     onClick={() => toggleContact(contact._id)}
                //   >
                //     <span className="text-sm">{contact.name}</span>
                //     <input
                //       type="checkbox"
                //       checked={selectedContactIds.includes(contact._id)}
                //       readOnly
                //       className="form-checkbox h-4 w-4 text-black rounded"
                //     />
                //   </div>
                // ))
                allContacts.map((contact) => {
                  const isUserContact =
                    userContact && contact._id === userContact._id;
                  return (
                    <div
                      key={contact._id}
                      className="flex items-center justify-between p-1 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleContact(contact._id)}
                    >
                      <span className="text-sm">{contact.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(contact._id)}
                        readOnly
                        className="form-checkbox h-4 w-4 text-black rounded"
                        disabled={isUserContact} // disable checkbox for logged-in user
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Create Button */}
          <button
            disabled={isCreateDisabled}
            className={`border rounded px-4 py-2 w-full transition ${
              isCreateDisabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            Create Group ({selectedContactIds.length} member
            {selectedContactIds.length !== 1 ? "s" : ""})
          </button>
        </form>

        {/* --- GROUP LIST --- */}
        <div className="rounded border mt-4">
          {isLoading ? (
            <div className="p-4 text-gray-500">Loading…</div>
          ) : groups?.length === 0 ? (
            <div className="p-4 text-gray-500">No groups yet.</div>
          ) : (
            <ul className="divide-y">
              {groups.map((g) => (
                <li
                  key={g._id}
                  className="p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-sm text-gray-500">
                      {g.memberCount ?? 0} members
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Link
                      className="underline"
                      href={`/groups/${encodeURIComponent(g.name)}`}
                    >
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

      {/* Error Modal */}
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

      {/* Delete Confirmation Modal */}
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
