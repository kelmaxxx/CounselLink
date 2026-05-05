import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTests } from "../../context/TestsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "accepted", label: "Accepted" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const normalizeDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

export default function CounselorReports() {
  const { currentUser } = useAuth();
  const { getTestsForCurrentUser, fetchTests } = useTests();
  const { createTestResult, testResults, fetchTestResults } = useTestResults();
  const { appointments, fetchAppointments } = useAppointments();

  const [sendResultModal, setSendResultModal] = useState({ open: false });
  const [filters, setFilters] = useState({ status: "all", dateFrom: "", dateTo: "", search: "" });
  const [resultForm, setResultForm] = useState({
    testId: "",
    testName: "",
    completedDate: new Date().toISOString().split("T")[0],
    summary: "",
    recommendations: "",
  });

  useEffect(() => {
    fetchTests().catch(() => undefined);
    fetchTestResults().catch(() => undefined);
    fetchAppointments().catch(() => undefined);
  }, [fetchTests, fetchTestResults, fetchAppointments]);

  const myTests = getTestsForCurrentUser ? getTestsForCurrentUser() : [];

  const filteredTests = useMemo(() => {
    return myTests.filter((test) => {
      if (filters.status !== "all" && test.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const searchValue = filters.search.toLowerCase();
        const name = `${test.studentName || ""} ${test.student_id || test.studentId || ""}`.toLowerCase();
        if (!name.includes(searchValue)) {
          return false;
        }
      }
      if (filters.dateFrom || filters.dateTo) {
        const dateValue =
          normalizeDateValue(test.preferredDate) ||
          normalizeDateValue(test.scheduledDate) ||
          normalizeDateValue(test.created_at);
        if (!dateValue) return false;
        const date = new Date(dateValue);
        if (filters.dateFrom && date < new Date(filters.dateFrom)) return false;
        if (filters.dateTo && date > new Date(filters.dateTo)) return false;
      }
      return true;
    });
  }, [myTests, filters]);

  const completedTests = myTests.filter((t) =>
    ["approved", "rescheduled", "accepted", "completed"].includes(t.status)
  );

  const pendingTests = myTests.filter((t) => t.status === "pending").length;
  const approvedTests = myTests.filter((t) => ["approved", "accepted"].includes(t.status)).length;
  const rescheduledTests = myTests.filter((t) => t.status === "rescheduled").length;
  const resultsSent = testResults.length;

  const counselingAppointments = (appointments || []).filter(
    (apt) => apt.appointment_type !== "psychological_test"
  );

  const openSendResultModal = () => {
    setResultForm({
      testId: "",
      testName: "",
      completedDate: new Date().toISOString().split("T")[0],
      summary: "",
      recommendations: "",
    });
    setSendResultModal({ open: true });
  };

  const handleSendResult = async (e) => {
    e.preventDefault();
    const selectedTest = completedTests.find((t) => t.id === Number(resultForm.testId));
    if (!selectedTest) {
      alert("Please select a test");
      return;
    }

    const res = await createTestResult({
      appointmentId: selectedTest.id,
      studentId: selectedTest.student_id || selectedTest.studentUserId,
      testName: resultForm.testName,
      completedDate: resultForm.completedDate,
      summary: resultForm.summary,
      recommendations: resultForm.recommendations,
    });

    if (res.success) {
      alert("Test result sent successfully!");
      setSendResultModal({ open: false });
      await fetchTestResults();
    } else {
      alert(res.message || "Failed to send test result");
    }
  };

  const updateFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const clearFilters = () => {
    setFilters({ status: "all", dateFrom: "", dateTo: "", search: "" });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Counselor Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Pending Tests</p>
          <p className="text-2xl font-bold text-gray-900">{pendingTests}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Approved Tests</p>
          <p className="text-2xl font-bold text-gray-900">{approvedTests}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Rescheduled Tests</p>
          <p className="text-2xl font-bold text-gray-900">{rescheduledTests}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500">Results Sent</p>
          <p className="text-2xl font-bold text-gray-900">{resultsSent}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={filters.status}
              onChange={updateFilter("status")}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.dateFrom}
              onChange={updateFilter("dateFrom")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={filters.dateTo}
              onChange={updateFilter("dateTo")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Search</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="Name or ID"
              value={filters.search}
              onChange={updateFilter("search")}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Psychological Test Results</h3>
          <p className="text-gray-600 mb-4">Send test results to students who have completed psychological tests</p>
          <button
            onClick={openSendResultModal}
            className="w-full bg-maroon-500 text-white py-2 rounded-lg hover:bg-maroon-600 transition"
          >
            Send Test Results
          </button>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Counseling Sessions Overview</h3>
          <p className="text-gray-600 mb-4">Monitor counseling sessions assigned to you.</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Total Sessions:</span>
              <span className="font-medium text-gray-900">{counselingAppointments.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Sessions:</span>
              <span className="font-medium text-gray-900">
                {counselingAppointments.filter((apt) => apt.status === "pending").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Completed Sessions:</span>
              <span className="font-medium text-gray-900">
                {counselingAppointments.filter((apt) => apt.status === "completed").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filtered Test Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Test Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Preferred Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTests.length > 0 ? (
                filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{test.studentName || "Student"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{test.testType || "Psychological Test"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {test.preferredDate || test.scheduledDate || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {test.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No tests match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sendResultModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send Psychological Test Result</h3>
              <button
                onClick={() => setSendResultModal({ open: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSendResult} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Student Test *</label>
                <select
                  required
                  className="w-full border rounded px-3 py-2"
                  value={resultForm.testId}
                  onChange={(e) => {
                    const testId = e.target.value;
                    const test = completedTests.find((t) => t.id === Number(testId));
                    setResultForm({
                      ...resultForm,
                      testId,
                      testName: test ? test.testType : "",
                    });
                  }}
                >
                  <option value="">-- Select a completed test --</option>
                  {completedTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.studentName} - {t.testType} ({t.scheduledDate || t.preferredDate})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded px-3 py-2"
                  value={resultForm.testName}
                  onChange={(e) => setResultForm({ ...resultForm, testName: e.target.value })}
                  placeholder="e.g., Career Interest Inventory"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date *</label>
                <input
                  type="date"
                  required
                  className="w-full border rounded px-3 py-2"
                  value={resultForm.completedDate}
                  onChange={(e) => setResultForm({ ...resultForm, completedDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Summary / Results *</label>
                <textarea
                  rows={5}
                  required
                  className="w-full border rounded px-3 py-2"
                  value={resultForm.summary}
                  onChange={(e) => setResultForm({ ...resultForm, summary: e.target.value })}
                  placeholder="Brief summary of test results and findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                <textarea
                  rows={4}
                  className="w-full border rounded px-3 py-2"
                  value={resultForm.recommendations}
                  onChange={(e) => setResultForm({ ...resultForm, recommendations: e.target.value })}
                  placeholder="Recommended actions or next steps..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setSendResultModal({ open: false })}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700">
                  Send to Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
