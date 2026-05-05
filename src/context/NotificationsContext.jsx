import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
  const { currentUser, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${apiBase}/api/notifications`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Unable to load notifications");
        }
        if (mounted) {
          setNotifications(
            data.map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              link: n.link,
              read: n.status === "read",
              createdAt: n.created_at,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [token, apiBase]);

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

  const getNotificationsForCurrentUser = () => notifications;

  const getUnreadCount = () => {
    return getNotificationsForCurrentUser().filter(n => !n.read).length;
  };

  return (
    <NotificationsContext.Provider value={{
      notifications,
      markAsRead,
      markAllAsRead,
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
