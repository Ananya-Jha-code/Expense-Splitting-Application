"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";

export default function GroupChat({ groupId, currentUserId }) {
  const messages = useQuery(api.messages.list, { groupId }) || [];
  const sendMessage = useMutation(api.messages.send);
  const [text, setText] = useState("");

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    await sendMessage({ groupId, text });
    setText("");
  };

  return (
    <div className="flex flex-col h-full border rounded-lg shadow bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div
              key={m._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs break-words px-4 py-2 rounded-lg shadow 
                  ${isMine ? "bg-blue-600 text-white" : "bg-white text-gray-800"}`}
              >
                {!isMine && <div className="font-semibold">{m.senderName}</div>}
                <div>{m.text}</div>
                <div className="text-xs text-gray-300 mt-1 text-right">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex border-t p-2 gap-2 bg-gray-100"
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
