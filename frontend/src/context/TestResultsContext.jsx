import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";

const TestResultsContext = createContext();

const normalizeResult = (result) => ({
  ...result,
  completedDate: result.completed_date || result.completedDate || null,
  counselorName: result.counselorName || result.counselor_name || null,
  studentName: result.studentName || result.student_name || null,
  testName: result.test_name || result.testName || null,
  summary: result.summary || "",
  recommendations: result.recommendations || "",
  resultFileUrl: result.result_file_url || result.resultFileUrl || null,
  resultFileName: result.result_file_name || result.resultFileName || null,
  resultFileType: result.result_file_type || result.resultFileType || null,
});

export function TestResultsProvider({ children }) {
  const { currentUser, token } = useAuth();
  const { subscribe } = useRealtime();
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";
  const [testResults, setTestResults] = useState([]);

  const fetchTestResults = useCallback(async () => {
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
  }, [apiBase, token]);

  const createTestResult = async ({ appointmentId, studentId, testName, completedDate, summary, recommendations, resultFile }) => {
    // multipart/form-data (not JSON) so an optional result document/photo can
    // ride along — the browser sets the Content-Type boundary automatically.
    const body = new FormData();
    if (appointmentId != null) body.append("appointmentId", appointmentId);
    body.append("studentId", studentId);
    body.append("testName", testName);
    body.append("completedDate", completedDate);
    if (summary) body.append("summary", summary);
    if (recommendations) body.append("recommendations", recommendations);
    if (resultFile) body.append("resultFile", resultFile);

    const response = await fetch(`${apiBase}/api/test-results`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Live updates: re-fetch when the server signals a released test result.
  useEffect(() => {
    if (!token) return undefined;
    return subscribe("test-results", () => {
      fetchTestResults().catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, subscribe]);

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
