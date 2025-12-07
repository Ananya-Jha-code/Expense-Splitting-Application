"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import UserSearchBar from "@/components/UserSearchBar";
import { Edit2, Users, ArrowLeft } from "react-feather"; 


const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return parts.map(part => part[0]).join('').substring(0, 2).toUpperCase();
};

const AvatarInitials = ({ name }) => {
    const initials = getInitials(name);
    
    return (
        <div 
            className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0"
        >
            {initials}
        </div>
    );
};
const MessageBubble = ({ text, isMe }) => {
    return (
        <div
            className={`
                px-4 py-2 break-words
                max-w-full 
                ${isMe ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}
                rounded-2xl
                ${isMe ? "rounded-br-none" : "rounded-bl-none"}
            `}
        >
            {text}
        </div>
    );
};

export default function MessagesPage() {
  const { user } = useUser();

  const conversations = useQuery(api.messages.listConversations);
  // console.log("Conversations List:", conversations);

  const [activeChatId, setActiveChatId] = React.useState(null);

  const messages = useQuery(
    api.messages.getMessages,
    activeChatId ? { conversationId: activeChatId } : "skip"
  );

  const createGroup = useMutation(api.messages.createGroup);
  const startConversation = useMutation(api.messages.startConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteConversation = useMutation(api.messages.deleteConversation); 
  const markAsRead = useMutation(api.messages.markAsRead);

  const [selectedMembers, setSelectedMembers] = React.useState([]); 
  const [messageInput, setMessageInput] = React.useState("");
  const [error, setError] = React.useState("");
  const [showSearch, setShowSearch] = React.useState(false); 
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false); 
  const [groupName, setGroupName] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  

  /**
   * Cleans up the creation state.
   */
  const resetCreationState = () => {
    setSelectedMembers([]);
    setGroupName("");
    setShowSearch(false);
    setIsCreatingGroup(false);
  };
  
  /**
   * Handles the selection of a user from the UserSearchBar component.
   */
  const handleUserSelect = (selectedUser) => {
    if (selectedUser) {
      if (isCreatingGroup) {
        if (!selectedMembers.find(m => m.tokenIdentifier === selectedUser.tokenIdentifier)) {
          setSelectedMembers((prev) => [...prev, selectedUser]);
        }
      } else {
        setSelectedMembers([selectedUser]);
      }
    }
  };


  /**
   * Starts a DM or a Group Chat based on the current state.
   */
  async function onCreateConversation() {
    if (selectedMembers.length === 0) return;

    try {
      let result;
      
      if (isCreatingGroup) {
        // --- GROUP CHAT LOGIC ---
        if (selectedMembers.length < 2) {
            setError("A group chat must have at least two members (including yourself).");
            return;
        }
        if (!groupName.trim()) {
            setError("Group name is required.");
            return;
        }

        const memberData = selectedMembers.map(m => ({ 
            id: m.tokenIdentifier, 
            name: m.name 
        }));

        result = await createGroup({
            groupName: groupName.trim(),
            memberIds: memberData,
        });

      } else {
        // --- DM LOGIC ---
        if (selectedMembers.length !== 1) return;
        
        const otherUser = selectedMembers[0];
        
        result = await startConversation({
          otherUserId: otherUser.tokenIdentifier,
          otherUserName: otherUser.name,
        });
      }

      setActiveChatId(result.conversationId);
      resetCreationState();

    } catch (err){
      console.error("Failed to create conversation:", err);
      setError("Failed to create conversation. " + (err.message || ""));
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


  async function confirmDelete() {
    if (!deleteTarget) return;
    const conversationId = deleteTarget.id;
    setDeleteTarget(null); // Close the modal immediately

    try {
        await deleteConversation({ conversationId });
        if (activeChatId === conversationId) {
            setActiveChatId(null);
        }
    } catch (err) {
        setError("Failed to delete conversation.");
    }
}

async function triggerDeleteModal(e, conversationId, conversationName) {
    e.stopPropagation(); 

    setDeleteTarget({ id: conversationId, name: conversationName });
}

  const isLoadingConversations = conversations === undefined;
  
  const activeChat = conversations?.find((c) => c._id === activeChatId);


  // --- Render Functions ---

  const renderCreationPanel = () => {
    const isReadyToCreate = isCreatingGroup 
      ? selectedMembers.length >= 2 && groupName.trim()
      : selectedMembers.length === 1;

    // The single user for DM mode
    const selectedDMUser = selectedMembers[0];
      
    return (
      <div className="overflow-hidden p-4 transition-all duration-300 border-b">
        {/* Back button and title */}
        <div className="flex items-center mb-4">
            <button
                onClick={resetCreationState}
                className="p-1 rounded hover:bg-gray-200 mr-3"
            >
                <ArrowLeft size={20} />
            </button>
            <h3 className="text-lg font-semibold">
                {isCreatingGroup ? "New Group Chat" : "New Direct Message"}
            </h3>
        </div>
        
        {/* Group Name Input */}
        {isCreatingGroup && (
            <input
                type="text"
                placeholder="Enter Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-3"
            />
        )}
        
        {/* User Search Bar */}
        <UserSearchBar onSelect={handleUserSelect} />
        
        {/* Selected Members Preview */}
        {isCreatingGroup && selectedMembers.length > 0 && (
            <div className="mt-3">
                <p className="text-sm font-medium mb-1">Members ({selectedMembers.length}):</p>
                <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                        <span key={member.tokenIdentifier} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                            {member.name}
                            <button 
                                onClick={() => setSelectedMembers(selectedMembers.filter(m => m.tokenIdentifier !== member.tokenIdentifier))}
                                className="ml-1 text-blue-800 hover:text-red-500"
                            >
                                &times;
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        )}
        
        {/* Call to Action Button */}
        {isReadyToCreate && (
            <button
                onClick={onCreateConversation}
                className="mt-4 w-full bg-black text-white py-2 rounded disabled:bg-gray-400"
                disabled={!isReadyToCreate}
            >
                {isCreatingGroup 
                    ? `Create Group "${groupName.trim() || '...'}"`
                    : `Start Chat with ${selectedDMUser.name}`
                }
            </button>
        )}
      </div>
    );
  };


  return (
    <main className="w-full h-screen flex overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-semibold">Messages</h1>
          <div className="flex gap-2">
            
            {/* New Group Button */}
            <button
                onClick={() => { setShowSearch(true); setIsCreatingGroup(true); setSelectedMembers([]); setGroupName(""); }}
                className="p-2 rounded hover:bg-gray-100"
                title="New Group Chat"
            >
                <Users size={26} /> 
            </button>
            
            {/* New DM Button */}
            <button
                onClick={() => { setShowSearch(true); setIsCreatingGroup(false); setSelectedMembers([]); setGroupName(""); }}
                className="p-2 rounded hover:bg-gray-100"
                title="New Direct Message"
            >
                <Edit2 size={26} /> 
            </button>
          </div>
        </div>

        <SignedOut>
          <div className="p-4">
            <p>Please sign in to view your messages.</p>
            <SignInButton />
          </div>
        </SignedOut>

        <SignedIn>
          {/* Conversation Creation/Search Panel */}
          {showSearch && renderCreationPanel()}

          {/* Conversation List */}
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
                    className={`p-4 cursor-pointer border-b hover:bg-gray-50 flex items-start ${ 
                      activeChatId === c._id ? "bg-gray-100" : ""
                    }`}
                  >
                    {/* Unread indicator */}
                    {c.hasUnread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Name and Icon */}
                      <div className="flex justify-between items-center">
                        
                        <div className="font-medium truncate mr-2 flex items-center">
                            {c.isGroup && <Users size={16} className="mr-1 text-gray-500" />}
                            {c.name}
                        </div>

                        <button
                          onClick={(e) => triggerDeleteModal(e, c._id, c.name)}
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

                      {/* Message Preview (Below Name) */}
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
        {!activeChatId || !activeChat ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Select a conversation to start messaging.
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold flex items-center">
                {activeChat.isGroup && <Users size={20} className="mr-2 text-gray-500" />}
                {activeChat.name}
              </h2>
            </div>

            
            {/* Messages */}
            <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
            
            >
            {messages === undefined ? (
                <p>Loading…</p>
            ) : (
                messages?.map((m) => {
                    // This logic remains the same: compare sender ID to current user ID
                    const fullClerkId = String(m.senderId ?? ""); 
                    const shortUserId = String(user?.id ?? "");
                    const isMe = fullClerkId.includes(shortUserId);
                    const showAvatar = !isMe;   
                    const senderName = m.senderName || "Unknown User";
                    return (
                        <div
                        key={m._id}
                        className={`w-full flex ${isMe ? "justify-end" : "justify-start"}`}
                        title={`${senderName}`} // (ID: ${fullClerkId})
                        >
                        {showAvatar && (
                            <div className="mr-2 mt-auto">
                                <AvatarInitials name={senderName} />
                             </div>
                        )}
                        
                        <div className={`flex flex-col max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
                            {activeChat.isGroup && !isMe && (
                                 <p className="text-xs text-gray-600 mb-0.5 px-1">{senderName}</p>
                             )}
                            <MessageBubble text={m.text} isMe={isMe} />
                         </div>

                            {!showAvatar && <div className="w-8 mr-2 flex-shrink-0" />}
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

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
                <h2 className="text-lg font-semibold text-red-600">
                    Delete Conversation?
                </h2>
                <p className="text-gray-700">
                    Are you sure you want to delete the conversation with{" "}
                    <span className="font-semibold">{deleteTarget.name}</span>? <br />
                    This will only delete it for you.
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