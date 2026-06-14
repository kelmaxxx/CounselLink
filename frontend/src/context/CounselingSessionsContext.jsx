import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";

const CounselingSessionsContext = createContext();

export function CounselingSessionsProvider({ children }) {
  const { token, currentUser } = useAuth();
  const { subscribe } = useRealtime();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const [sessions, setSessions] = useState([]);

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const fetchSessions = async (params = {}) => {
    if (!token) return [];
    const qs = new URLSearchParams(params).toString();
    const url = `${apiBase}/api/counseling-sessions${qs ? `?${qs}` : ""}`;
    const response = await authFetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load sessions");
    setSessions(Array.isArray(data) ? data : []);
    return data;
  };

  const fetchSessionByAppointment = async (appointmentId) => {
    if (!token || !appointmentId) return null;
    const response = await authFetch(`${apiBase}/api/counseling-sessions/by-appointment/${appointmentId}`);
    if (response.status === 404) return null;
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load session");
    return data;
  };

  const createSession = async (payload) => {
    const response = await authFetch(`${apiBase}/api/counseling-sessions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return { success: false, message: data.message || "Failed to create session" };
    setSessions((prev) => [data, ...prev]);
    return { success: true, session: data };
  };

  const updateSession = async (id, updates) => {
    const response = await authFetch(`${apiBase}/api/counseling-sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) return { success: false, message: data.message || "Failed to update session" };
    setSessions((prev) => prev.map((s) => (s.id === data.id ? data : s)));
    return { success: true, session: data };
  };

  const deleteSession = async (id) => {
    const response = await authFetch(`${apiBase}/api/counseling-sessions/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) return { success: false, message: data.message || "Failed to delete session" };
    setSessions((prev) => prev.filter((s) => s.id !== Number(id)));
    return { success: true };
  };

  const finalizeSession = async (id) => {
    const response = await authFetch(`${apiBase}/api/counseling-sessions/${id}/finalize`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) return { success: false, message: data.message || "Failed to submit report" };
    if (data.session) {
      setSessions((prev) => prev.map((s) => (s.id === data.session.id ? data.session : s)));
    }
    return { success: true, ...data };
  };

  useEffect(() => {
    if (!token) {
      setSessions([]);
      return;
    }
    if (["counselor", "admin", "college_rep", "student"].includes(currentUser?.role)) {
      fetchSessions().catch((err) => console.error("Failed to load sessions:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser?.role]);

  // Live updates: re-fetch whenever the server signals a session change.
  useEffect(() => {
    if (!token) return undefined;
    return subscribe("sessions", () => {
      fetchSessions().catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, subscribe]);

  return (
    <CounselingSessionsContext.Provider
      value={{
        sessions,
        fetchSessions,
        fetchSessionByAppointment,
        createSession,
        updateSession,
        deleteSession,
        finalizeSession,
      }}
    >
      {children}
    </CounselingSessionsContext.Provider>
  );
}

export function useCounselingSessions() {
  return useContext(CounselingSessionsContext);
}
