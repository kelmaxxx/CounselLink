import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

const StudentRecordsContext = createContext();

export function StudentRecordsProvider({ children }) {
  const { token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
  };

  // ---- Inventory ----

  const getInventory = async (studentId) => {
    if (!token || !studentId) return null;
    const response = await authFetch(`${apiBase}/api/student-inventories/${studentId}`);
    if (response.status === 404) return null;
    const data = await parseJson(response);
    if (!response.ok) throw new Error(data.message || "Unable to load inventory");
    return data;
  };

  const upsertInventory = async (studentId, formData) => {
    const response = await authFetch(`${apiBase}/api/student-inventories/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({ formData }),
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to save inventory" };
    return { success: true, inventory: data };
  };

  const uploadInventoryScan = async (studentId, file) => {
    const fd = new FormData();
    fd.append("scan", file);
    const response = await authFetch(`${apiBase}/api/student-inventories/${studentId}/scan`, {
      method: "POST",
      body: fd,
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to upload scan" };
    return { success: true, inventory: data };
  };

  const deleteInventoryScan = async (studentId) => {
    const response = await authFetch(`${apiBase}/api/student-inventories/${studentId}/scan`, {
      method: "DELETE",
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to remove scan" };
    return { success: true };
  };

  // ---- Consent ----

  const getConsent = async (studentId) => {
    if (!token || !studentId) return null;
    const response = await authFetch(`${apiBase}/api/student-consents/${studentId}`);
    if (response.status === 404) return null;
    const data = await parseJson(response);
    if (!response.ok) throw new Error(data.message || "Unable to load consent");
    return data;
  };

  const eSignConsent = async (studentId, { typedName, scope }) => {
    const response = await authFetch(`${apiBase}/api/student-consents/${studentId}/e-sign`, {
      method: "POST",
      body: JSON.stringify({ typedName, scope }),
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to record consent" };
    return { success: true, consent: data };
  };

  const uploadConsentScan = async (studentId, file, scope = "") => {
    const fd = new FormData();
    fd.append("scan", file);
    if (scope) fd.append("scope", scope);
    const response = await authFetch(`${apiBase}/api/student-consents/${studentId}/scan`, {
      method: "POST",
      body: fd,
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to upload scan" };
    return { success: true, consent: data };
  };

  const deleteConsentScan = async (studentId) => {
    const response = await authFetch(`${apiBase}/api/student-consents/${studentId}/scan`, {
      method: "DELETE",
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to remove scan" };
    return { success: true };
  };

  const revokeConsent = async (studentId) => {
    const response = await authFetch(`${apiBase}/api/student-consents/${studentId}/revoke`, {
      method: "POST",
    });
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to revoke consent" };
    return { success: true };
  };

  const setReferralSharingConsent = async (studentId, allow) => {
    const response = await authFetch(
      `${apiBase}/api/student-consents/${studentId}/referral-sharing`,
      { method: "POST", body: JSON.stringify({ allow }) }
    );
    const data = await parseJson(response);
    if (!response.ok) return { success: false, message: data.message || "Failed to save your choice" };
    return { success: true, consent: data };
  };

  // Convenience: fetch both records for a student in parallel.
  // Returns { inventory, consent } — either can be null if not yet created.
  const getRecords = async (studentId) => {
    const [inventory, consent] = await Promise.all([
      getInventory(studentId).catch(() => null),
      getConsent(studentId).catch(() => null),
    ]);
    return { inventory, consent };
  };

  return (
    <StudentRecordsContext.Provider
      value={{
        getInventory,
        upsertInventory,
        uploadInventoryScan,
        deleteInventoryScan,
        getConsent,
        eSignConsent,
        uploadConsentScan,
        deleteConsentScan,
        revokeConsent,
        setReferralSharingConsent,
        getRecords,
      }}
    >
      {children}
    </StudentRecordsContext.Provider>
  );
}

export function useStudentRecords() {
  return useContext(StudentRecordsContext);
}
