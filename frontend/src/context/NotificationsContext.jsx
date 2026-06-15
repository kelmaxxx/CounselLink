import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { currentUser, token } = useAuth();
  const { subscribe } = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiBase}/api/notifications`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications");
      }
      setNotifications(
        data.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          link: n.link,
          type: n.type || "info",
          read: n.status === "read",
          createdAt: n.created_at,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }, [token, apiBase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Live updates: re-fetch whenever the server signals a new notification.
  useEffect(() => {
    if (!token) return undefined;
    return subscribe("notification", () => {
      loadNotifications();
    });
  }, [token, subscribe, loadNotifications]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch(`${apiBase}/api/notifications/${id}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch(`${apiBase}/api/notifications/read-all`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const addNotification = async ({ title, message, sendTo = "all" }) => {
    const response = await fetch(`${apiBase}/api/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title, message, sendTo }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to send announcement");
    }
    return data;
  };

  const getNotificationsForCurrentUser = () => notifications;

  const getUnreadCount = () => {
    return getNotificationsForCurrentUser().filter(n => !n.read).length;
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      markAsRead,
      markAllAsRead,
      addNotification,
      getNotificationsForCurrentUser,
      getUnreadCount,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
