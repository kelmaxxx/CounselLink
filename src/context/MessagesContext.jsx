import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const MessagesContext = createContext();

export function MessagesProvider({ children }) {
  const { currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);

  const normalizeMessage = (msg) => ({
    ...msg,
    senderId: msg.sender_id || msg.senderId,
    recipientId: msg.recipient_id || msg.recipientId,
    timestamp: msg.created_at || msg.timestamp,
    read: msg.status === "read" || msg.read,
  });

  const fetchConversations = async () => {
    if (!token) return [];
    const response = await fetch(`${apiBase}/api/messages/conversations`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load conversations");
    }
    const normalized = Array.isArray(data) ? data.map(normalizeMessage) : [];
    setConversations(normalized);
    return normalized;
  };

  const fetchConversation = async (userId) => {
    if (!token || !userId) return [];
    const response = await fetch(`${apiBase}/api/messages/conversations/${userId}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load conversation");
    }
    const normalized = Array.isArray(data) ? data.map(normalizeMessage) : [];
    setMessages(normalized);
    return normalized;
  };

  // Send a message
  const sendMessage = async ({ recipientId, content }) => {
    if (!currentUser || !recipientId || !content.trim()) {
      return { success: false, message: "Invalid message data" };
    }

    const response = await fetch(`${apiBase}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ recipientId, content }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to send message" };
    }
    await fetchConversation(recipientId);
    await fetchConversations();
    return { success: true };
  };

  // Get messages between current user and another user
  const getConversation = (userId) => {
    if (!currentUser || !userId) return [];
    return messages
      .filter(
        (m) =>
          (m.senderId === currentUser.id && m.recipientId === userId) ||
          (m.senderId === userId && m.recipientId === currentUser.id)
      )
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  // Get all conversations for current user
  const getConversationsForCurrentUser = () => {
    if (!currentUser) return [];
    return conversations
      .filter((m) => m.senderId === currentUser.id || m.recipientId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Mark messages as read
  const markAsRead = async (userId) => {
    if (!currentUser || !userId) return;
    await fetch(`${apiBase}/api/messages/conversations/${userId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    await fetchConversation(userId);
    await fetchConversations();
  };

  // Get unread count for a specific user
  const getUnreadCount = (userId) => {
    if (!currentUser || !userId) return 0;
    return messages.filter((m) => m.senderId === userId && m.recipientId === currentUser.id && !m.read).length;
  };

  // Get total unread count
  const getTotalUnreadCount = () => {
    if (!currentUser) return 0;
    return messages.filter((m) => m.recipientId === currentUser.id && !m.read).length;
  };

  useEffect(() => {
    fetchConversations().catch(() => undefined);
  }, [token]);

  return (
    <MessagesContext.Provider
      value={{
        messages,
        conversations,
        sendMessage,
        getConversation,
        getConversationsForCurrentUser,
        markAsRead,
        getUnreadCount,
        getTotalUnreadCount,
        fetchConversation,
        fetchConversations,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
