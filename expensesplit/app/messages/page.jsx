"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import UserSearchBar from "@/components/UserSearchBar";
import { Edit2 } from "react-feather";  // <-- import Feather icon


export default function MessagesPage() {
  const { user } = useUser();

  // left sidebar: list of conversations
  const conversations = useQuery(api.messages.listConversations);
  console.log("Aditi's Conversations List:", conversations);

  // for chat right panel
  const [activeChatId, setActiveChatId] = React.useState(null);

  const messages = useQuery(
    api.messages.getMessages,
    activeChatId ? { conversationId: activeChatId } : "skip"
  );

  const startConversation = useMutation(api.messages.startConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteConversation = useMutation(api.messages.deleteConversation); 
  const markAsRead = useMutation(api.messages.markAsRead);

  const [selectedUser, setSelectedUser] = React.useState(null);
  const [messageInput, setMessageInput] = React.useState("");
  const [error, setError] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false);


  async function onStartConversation() {
    if (!selectedUser) return;

    try {
      console.log("Starting conversation with:", selectedUser);

      const result = await startConversation({
        otherUserId: selectedUser.tokenIdentifier,
        otherUserName: selectedUser.name, 
      });
      console.log("Conversation started:", result);


      setActiveChatId(result.conversationId);
      setSelectedUser(null);
      setShowSearch(false);

    } catch (err){
      console.error("Failed to start conversation:", err);

      setError("Failed to start conversation.");
    }
  }

  async function onSendMessage(e) {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId) return;

    try {
      await sendMessage({
        conversationId: activeChatId,
        text: messageInput.trim(),
      });
      setMessageInput("");
    } catch (err) {
      setError("Failed to send message.");
    }
  }

  async function onDeleteConversation(e, conversationId) {
    e.stopPropagation(); // Prevents the chat from opening when you click delete

    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteConversation({ conversationId });
      
      // If we deleted the chat that is currently open, close the panel
      if (activeChatId === conversationId) {
        setActiveChatId(null);
      }
    } catch (err) {
      setError("Failed to delete conversation.");
    }
  }

  const isLoadingConversations = conversations === undefined;

  return (
    <main className="w-full h-screen flex overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
            <button
                onClick={() => setShowSearch((prev) => !prev)}
                className="p-2 rounded hover:bg-gray-100"
                title="New Message"
                >
                <Edit2 size={26} /> 
            </button>
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>

        <SignedOut>
          <div className="p-4">
            <p>Please sign in to view your messages.</p>
            <SignInButton />
          </div>
        </SignedOut>

        <SignedIn>
          {showSearch && (
            <div className="overflow-hidden p-4 transition-all duration-300">
                <UserSearchBar onSelect={setSelectedUser} />
                {selectedUser && (
                <button
                    onClick={onStartConversation}
                    className="mt-2 w-full bg-black text-white py-2 rounded"
                >
                    Start Chat with {selectedUser.name}
                </button>
                )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoadingConversations ? (
              <p className="p-4 text-gray-500">Loading…</p>
            ) : conversations?.length === 0 ? (
              <p className="p-4 text-gray-500">No conversations yet.</p>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li
                    key={c._id}
                    onClick={async () => {
                        setActiveChatId(c._id);
                        if (c.hasUnread) {
                            await markAsRead({ conversationId: c._id });
                        }
                    }}

                    // Ensure the main container is a flex container
                    className={`p-4 cursor-pointer border-b hover:bg-gray-50 flex justify-between items-start ${ 
                      activeChatId === c._id ? "bg-gray-100" : ""
                    }`}
                  >
                    {/* Unread indicator */}
                    {c.hasUnread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    )}

                    {/* 1. Main Content Area (Takes all available space) */}
                    <div className="flex-1 min-w-0">
                      
                      {/* 1a. Name and Icon (Nested Horizontal Flex) */}
                      <div className="flex justify-between items-center">
                        
                        {/* Name (Set to truncate if too long) */}
                        <div className="font-medium truncate mr-2">
                          {c.otherUser.name}
                        </div>

                        {/* TRASH ICON - Always Visible & Right Aligned by justify-between */}
                        <button
                          onClick={(e) => onDeleteConversation(e, c._id)}
                          // Removed opacity classes to make it always visible
                          className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0" 
                          title="Delete Conversation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>

                      {/* 1b. Message Preview (Below Name) */}
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {c.lastMessage || "No messages yet"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SignedIn>
      </div>

      {/* RIGHT CHAT PANEL */}
      <div className="flex-1 flex flex-col min-h-0">
        {!activeChatId ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Select a conversation to start messaging.
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">
                {
                  conversations?.find((c) => c._id === activeChatId)
                    ?.otherUser?.name
                }
              </h2>
            </div>

            
            {/* Messages */}
            <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
            // optional: ensure scrolling starts at bottom; you can keep/remove
            // ref={messagesContainerRef}
            >
            {messages === undefined ? (
                <p>Loading…</p>
            ) : (
                messages?.map((m) => {
                    // The full sender ID from the DB
                    const fullClerkId = String(m.senderId ?? ""); 
                    // The short ID of the current user (Aditi)
                    const shortUserId = String(user?.id ?? "");

                    // Check if the full DB ID includes the short client ID
                    const isMe = fullClerkId.includes(shortUserId);

                    // TEMP DEBUG — remove after confirming things work
                    console.log("Message Debug:", { 
                        text: m.text, 
                        messageSenderId: fullClerkId, 
                        receiverCurrentUserId: shortUserId, 
                        isMe: isMe 
                    });

                    return (
                        <div
                        key={m._id}
                        className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}
                        title={`senderId: ${fullClerkId} (you: ${shortUserId})`} // small hover debug
                        >
                        <div
                            className={`
                            px-4 py-2 break-words
                            max-w-[65%]
                            ${isMe ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}
                            rounded-2xl
                            ${isMe ? "rounded-br-none" : "rounded-bl-none"}
                            `}
                        >
                            {m.text}
                        </div>
                        </div>
                    );
                })
            )}
            </div>


            {/* Input */}
            <form
              onSubmit={onSendMessage}
              className="p-4 border-t flex gap-2"
            >
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button className="bg-black text-white px-4 py-2 rounded">
                Send
              </button>
            </form>
          </>
        )}
      </div>

      {/* Error modal */}
      {error && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg text-center space-y-3 w-80">
            <h2 className="text-lg font-semibold text-red-600">Error</h2>
            <p>{error}</p>
            <button
              onClick={() => setError("")}
              className="bg-black text-white px-4 py-2 rounded"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
