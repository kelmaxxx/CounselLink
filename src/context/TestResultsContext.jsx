import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const TestResultsContext = createContext();

export function TestResultsProvider({ children }) {
  const { currentUser, token } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [testResults, setTestResults] = useState([]);

  const normalizeResult = (result) => ({
    ...result,
    completedDate: result.completed_date || result.completedDate || null,
    counselorName: result.counselorName || result.counselor_name || null,
    studentName: result.studentName || result.student_name || null,
    testName: result.test_name || result.testName || null,
    summary: result.summary || "",
    recommendations: result.recommendations || "",
  });

  const fetchTestResults = async () => {
    if (!token) return [];
    const response = await fetch(`${apiBase}/api/test-results`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Unable to load test results");
    }
    const normalized = Array.isArray(data) ? data.map(normalizeResult) : [];
    setTestResults(normalized);
    return normalized;
  };

  const createTestResult = async ({ appointmentId, studentId, testName, completedDate, summary, recommendations }) => {
    const response = await fetch(`${apiBase}/api/test-results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ appointmentId, studentId, testName, completedDate, summary, recommendations }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || "Unable to save test result" };
    }
    await fetchTestResults();
    return { success: true };
  };

  const getTestResultsForCurrentUser = () => {
    if (!currentUser) return [];
    if (currentUser.role === "student") {
      return testResults.filter(r => r.student_id === currentUser.id || r.studentId === currentUser.id);
    }
    return testResults;
  };

  useEffect(() => {
    fetchTestResults().catch(() => undefined);
  }, [token]);

  return (
    <TestResultsContext.Provider value={{
      testResults,
      createTestResult,
      getTestResultsForCurrentUser,
      fetchTestResults,
    }}>
      {children}
    </TestResultsContext.Provider>
  );
}

export function useTestResults() {
  return useContext(TestResultsContext);
}
