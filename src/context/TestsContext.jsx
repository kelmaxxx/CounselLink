import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const TestsContext = createContext();

export function TestsProvider({ children }) {
  const { currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [tests, setTests] = useState([]);

  const normalizeTest = (test) => ({
    ...test,
    preferredDate: test.preferred_date || test.preferredDate || null,
    preferredSlots:
      test.preferred_slots?.split(",").filter(Boolean) || test.preferredSlots || [],
    scheduledDate: test.scheduled_date || test.scheduledDate || null,
    scheduledTimeSlot: test.scheduled_time || test.scheduledTimeSlot || null,
    counselorName: test.counselorName || test.counselor_name || null,
    studentName: test.studentName || test.student_name || null,
    controlNo: test.controlNo || `PT-${String(test.id).padStart(6, "0")}`,
    note: test.counselor_action_note || test.note || null,
  });

  const fetchTests = async () => {
    if (!token) return [];
    const response = await fetch(`${apiBase}/api/tests`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load tests");
    }
    const normalized = Array.isArray(data) ? data.map(normalizeTest) : [];
    setTests(normalized);
    return normalized;
  };

  const createTestRequest = async ({ student, form }) => {
    const response = await fetch(`${apiBase}/api/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        preferredDate: form.date,
        preferredSlots: form.preferredSlots,
        phoneNumber: form.phoneNumber,
        reason: form.reason,
        testType: form.testType,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to submit test request" };
    }
    await fetchTests();
    return { success: true, id: data.id };
  };

  const acceptTest = async ({ id, date = null, timeSlot = null, note = null }) => {
    const response = await fetch(`${apiBase}/api/tests/${id}/accept`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ date, timeSlot, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to accept test" };
    }
    await fetchTests();
    return { success: true };
  };

  const rescheduleTest = async ({ id, date, timeSlot, note = null }) => {
    const response = await fetch(`${apiBase}/api/tests/${id}/reschedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ date, timeSlot, note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to reschedule test" };
    }
    await fetchTests();
    return { success: true };
  };

  const rejectTest = async ({ id, note = null }) => {
    const response = await fetch(`${apiBase}/api/tests/${id}/reject`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ note }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to reject test" };
    }
    await fetchTests();
    return { success: true };
  };

  const getTestsForCurrentUser = () => {
    if (!currentUser) return [];
    if (currentUser.role === "student") {
      return tests.filter(t => t.student_id === currentUser.id || t.studentUserId === currentUser.id);
    }
    if (currentUser.role === "counselor") {
      return tests;
    }
    return tests;
  };

  useEffect(() => {
    fetchTests().catch(() => undefined);
  }, [token]);

  return (
    <TestsContext.Provider value={{
      tests,
      createTestRequest,
      getTestsForCurrentUser,
      acceptTest,
      rescheduleTest,
      rejectTest,
      fetchTests,
    }}>
      {children}
    </TestsContext.Provider>
  );
}

export function useTests() {
  return useContext(TestsContext);
}
