import React, { useState, useEffect, useRef } from "react";
import { X, Send, User } from "lucide-react";
import { useMessages } from "../context/MessagesContext";
import { useAuth } from "../context/AuthContext";

export default function ChatModal({ recipientUser, onClose }) {
  const { currentUser } = useAuth();
  const { getConversation, sendMessage, markAsRead, fetchConversation } = useMessages();
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadConversation = async () => {
      if (!recipientUser) return;
      try {
        await fetchConversation(recipientUser.id);
        const conv = getConversation(recipientUser.id);
        if (mounted) setConversation(conv);
        await markAsRead(recipientUser.id);
      } catch (error) {
        console.error(error);
      }
    };
    loadConversation();
    return () => {
      mounted = false;
    };
  }, [recipientUser, fetchConversation, getConversation, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const handleSend = async () => {
    if (!message.trim() || !recipientUser) return;

    const result = await sendMessage({
      recipientId: recipientUser.id,
      content: message,
    });

    if (result.success) {
      const conv = getConversation(recipientUser.id);
      setConversation(conv);
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl h-[600px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-maroon-600 text-white p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {recipientUser.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold">{recipientUser.name}</h3>
              <p className="text-sm text-maroon-100">{recipientUser.role === "student" ? "Student" : "Counselor"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {conversation.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            conversation.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] ${isMe ? "order-2" : "order-1"}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isMe ? "bg-maroon-600 text-white" : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${isMe ? "text-right" : "text-left"}`}>
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
        <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-maroon-500 resize-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
