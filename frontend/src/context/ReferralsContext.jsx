import React, { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "./AuthContext";

const ReferralsContext = createContext();
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export function ReferralsProvider({ children }) {
  const { token } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const fetchReferrals = useCallback(
    async ({ status } = {}) => {
      if (!token) return [];
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`${API_BASE}/api/referrals${qs}`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load referrals");
        setReferrals(Array.isArray(data) ? data : []);
        return data;
      } catch (err) {
        setError(err.message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [token, headers]
  );

  const createReferral = useCallback(
    async ({ studentId, receivingCounselorId, reason, notes }) => {
      const res = await fetch(`${API_BASE}/api/referrals`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ studentId, receivingCounselorId, reason, notes }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Failed" };
      await fetchReferrals();
      return { success: true, id: data.id };
    },
    [headers, fetchReferrals]
  );

  const decideReferral = useCallback(
    async (id, { status, decisionNote, scheduledDate, scheduledTime }) => {
      const res = await fetch(`${API_BASE}/api/referrals/${id}/decide`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ status, decisionNote, scheduledDate, scheduledTime }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Failed" };
      await fetchReferrals();
      return { success: true, ...data };
    },
    [headers, fetchReferrals]
  );

  const cancelReferral = useCallback(
    async (id) => {
      const res = await fetch(`${API_BASE}/api/referrals/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || "Failed" };
      await fetchReferrals();
      return { success: true };
    },
    [headers, fetchReferrals]
  );

  return (
    <ReferralsContext.Provider
      value={{
        referrals,
        loading,
        error,
        fetchReferrals,
        createReferral,
        decideReferral,
        cancelReferral,
      }}
    >
      {children}
    </ReferralsContext.Provider>
  );
}

export function useReferrals() {
  return useContext(ReferralsContext);
}
