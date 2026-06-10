import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";

const MessagesContext = createContext();

const normalizeMessage = (msg) => ({
  ...msg,
  senderId: msg.sender_id || msg.senderId,
  recipientId: msg.recipient_id || msg.recipientId,
  timestamp: msg.created_at || msg.timestamp,
  read: msg.status === "read" || msg.read,
});

export function MessagesProvider({ children }) {
  const { currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const [messagesByUser, setMessagesByUser] = useState({});
  const [conversations, setConversations] = useState([]);

  const fetchConversations = useCallback(async () => {
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
  }, [token, apiBase]);

  const fetchConversation = useCallback(async (userId) => {
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
    setMessagesByUser((prev) => ({ ...prev, [userId]: normalized }));
    return normalized;
  }, [token, apiBase]);

  const sendMessage = useCallback(async ({ recipientId, content }) => {
    if (!currentUser || !recipientId || !content.trim()) {
      return { success: false, message: "Invalid message data" };
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: currentUser.id,
      recipientId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
      pending: true,
    };
    setMessagesByUser((prev) => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), optimistic],
    }));

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
      setMessagesByUser((prev) => ({
        ...prev,
        [recipientId]: (prev[recipientId] || []).filter((m) => m.id !== tempId),
      }));
      return { success: false, message: data.message || "Unable to send message" };
    }
    await fetchConversation(recipientId);
    await fetchConversations();
    return { success: true };
  }, [currentUser, token, apiBase, fetchConversation, fetchConversations]);

  const getConversation = useCallback((userId) => {
    if (!currentUser || !userId) return [];
    return (messagesByUser[userId] || [])
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [currentUser, messagesByUser]);

  const getConversationsForCurrentUser = useCallback(() => {
    if (!currentUser) return [];
    return conversations
      .filter((m) => m.senderId === currentUser.id || m.recipientId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [currentUser, conversations]);

  const markAsRead = useCallback(async (userId) => {
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
  }, [currentUser, token, apiBase, fetchConversation, fetchConversations]);

  const getUnreadCount = useCallback((userId) => {
    if (!currentUser || !userId) return 0;
    return conversations.filter(
      (m) => m.senderId === userId && m.recipientId === currentUser.id && !m.read
    ).length;
  }, [currentUser, conversations]);

  const getTotalUnreadCount = useCallback(() => {
    if (!currentUser) return 0;
    return conversations.filter((m) => m.recipientId === currentUser.id && !m.read).length;
  }, [currentUser, conversations]);

  useEffect(() => {
    fetchConversations().catch(() => undefined);
    // Reset the per-user cache when the auth token flips (e.g. role switch).
    setMessagesByUser({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <MessagesContext.Provider
      value={{
        messagesByUser,
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
