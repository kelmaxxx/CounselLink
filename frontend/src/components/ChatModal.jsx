import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import { useMessages } from "../context/MessagesContext";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

const ROLE_LABEL = {
  student: "Student",
  counselor: "Counselor",
  admin: "Administrator",
  college_rep: "College Representative",
};

export default function ChatModal({ recipientUser, onClose }) {
  const { currentUser } = useAuth();
  const { getConversation, sendMessage, markAsRead, fetchConversation } = useMessages();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  const conversation = getConversation(recipientUser?.id);

  useEffect(() => {
    if (!recipientUser?.id) return;
    const loadConversation = async () => {
      try {
        await fetchConversation(recipientUser.id);
        await markAsRead(recipientUser.id);
      } catch (error) {
        console.error(error);
      }
    };
    loadConversation();
  }, [recipientUser?.id, fetchConversation, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length]);

  const handleSend = async () => {
    if (!message.trim() || !recipientUser) return;
    const result = await sendMessage({
      recipientId: recipientUser.id,
      content: message,
    });
    if (result.success) {
      setMessage("");
    } else {
      alert(result.message || "Failed to send message");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!recipientUser) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={recipientUser.name}
              url={recipientUser.avatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {recipientUser.name}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {ROLE_LABEL[recipientUser.role] || recipientUser.role}
                {recipientUser.college ? ` · ${recipientUser.college}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
          {conversation.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-400 mb-2">
                <MessageCircle size={16} />
              </div>
              <p className="text-sm font-medium text-gray-700">No messages yet</p>
              <p className="text-xs text-gray-500 mt-1">Start the conversation below.</p>
            </div>
          ) : (
            conversation.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isMe
                          ? "bg-maroon-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                    <p
                      className={`text-xs text-gray-500 mt-1 tabular-nums ${
                        isMe ? "text-right" : "text-left"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/25 focus:border-maroon-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-maroon-600 hover:bg-maroon-700 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={15} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
