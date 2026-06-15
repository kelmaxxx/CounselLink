import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";

const UrgentRequestsContext = createContext();
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function UrgentRequestsProvider({ children }) {
  const { token } = useAuth();
  const { subscribe } = useRealtime();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const fetchRequests = useCallback(async () => {
    if (!token) return [];
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/urgent-counseling-requests`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load urgent requests");
      setRequests(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  const resolveRequest = useCallback(
    async (id) => {
      const res = await fetch(`${API_BASE}/api/urgent-counseling-requests/${id}/resolve`, {
        method: "PUT",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Failed" };
      await fetchRequests();
      return { success: true, ...data };
    },
    [headers, fetchRequests]
  );

  // Live updates: re-fetch whenever the server signals an urgent request change.
  useEffect(() => {
    if (!token) return undefined;
    return subscribe("urgent-requests", () => {
      fetchRequests();
    });
  }, [token, subscribe, fetchRequests]);

  return (
    <UrgentRequestsContext.Provider
      value={{
        requests,
        loading,
        error,
        fetchRequests,
        resolveRequest,
      }}
    >
      {children}
    </UrgentRequestsContext.Provider>
  );
}

export function useUrgentRequests() {
  return useContext(UrgentRequestsContext);
}
