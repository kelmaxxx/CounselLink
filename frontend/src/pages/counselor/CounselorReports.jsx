import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTests } from "../../context/TestsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useAppointments } from "../../context/AppointmentsContext";
import {
  Send,
  Clock3,
  CheckCircle2,
  CalendarClock,
  Mail,
  FileText,
  Filter as FilterIcon,
  Search,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
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
  const { currentUser, token } = useAuth();
  const { getTestsForCurrentUser, fetchTests } = useTests();
  const { createTestResult, testResults, fetchTestResults } = useTestResults();
  const { appointments, fetchAppointments } = useAppointments();

  const [sendResultModal, setSendResultModal] = useState({ open: false });
  const [sendReportModal, setSendReportModal] = useState({ open: false });
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
      if (filters.status !== "all" && test.status !== filters.status) return false;
      if (filters.search) {
        const searchValue = filters.search.toLowerCase();
        const name = `${test.studentName || ""} ${test.student_id || test.studentId || ""}`.toLowerCase();
        if (!name.includes(searchValue)) return false;
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
  const counselingPending = counselingAppointments.filter((apt) => apt.status === "pending").length;
  const counselingCompleted = counselingAppointments.filter((apt) => apt.status === "completed").length;

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
  const clearFilters = () =>
    setFilters({ status: "all", dateFrom: "", dateTo: "", search: "" });

  const hasActiveFilters =
    filters.status !== "all" || filters.dateFrom || filters.dateTo || filters.search;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Reports"
        subtitle="Filter your test caseload, send results to students, and report to the College Dean."
        actions={
          <>
            <button onClick={openSendResultModal} className={BTN.secondary}>
              <Mail size={15} /> Send test result
            </button>
            <button onClick={() => setSendReportModal({ open: true })} className={BTN.primary}>
              <Send size={15} /> Send report
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Pending tests"
          value={pendingTests}
          hint="Awaiting decision"
          icon={Clock3}
          accent="bg-amber-500"
        />
        <StatCard
          label="Approved tests"
          value={approvedTests}
          hint="Confirmed by you"
          icon={CheckCircle2}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Rescheduled"
          value={rescheduledTests}
          hint="Pending reconfirmation"
          icon={CalendarClock}
          accent="bg-sky-500"
        />
        <StatCard
          label="Results sent"
          value={resultsSent}
          hint="Cumulative"
          icon={Mail}
          accent="bg-blue-500"
        />
      </div>

      {/* Counseling overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <SectionCard
          title="Counseling overview"
          subtitle="Sessions assigned to you"
          className="lg:col-span-1"
        >
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Total sessions</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">
                {counselingAppointments.length}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Pending</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{counselingPending}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Completed</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{counselingCompleted}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Filters"
          subtitle="Refine the test request list below"
          className="lg:col-span-2"
          action={
            hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className={LABEL}>Status</label>
              <select
                className={INPUT}
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
              <label className={LABEL}>Date from</label>
              <input
                type="date"
                className={INPUT}
                value={filters.dateFrom}
                onChange={updateFilter("dateFrom")}
              />
            </div>
            <div>
              <label className={LABEL}>Date to</label>
              <input
                type="date"
                className={INPUT}
                value={filters.dateTo}
                onChange={updateFilter("dateTo")}
              />
            </div>
            <div>
              <label className={LABEL}>Student search</label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  className={`${INPUT} pl-8`}
                  placeholder="Name or ID"
                  value={filters.search}
                  onChange={updateFilter("search")}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Filtered table */}
      <SectionCard
        title="Test requests"
        subtitle={
          hasActiveFilters
            ? `${filteredTests.length} match${filteredTests.length === 1 ? "" : "es"} of ${myTests.length} total`
            : `${filteredTests.length} total`
        }
        noBodyPadding
        action={
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FilterIcon size={12} />
            {hasActiveFilters ? "Filtered" : "All"}
          </span>
        }
      >
        {filteredTests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tests match your filters"
            hint="Adjust the filters above to broaden your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Test type</th>
                  <th className="px-4 py-2.5">Preferred date</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {test.studentName || "Student"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {test.testType || "Psychological test"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">
                      {test.preferredDate || test.scheduledDate || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={test.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Send result modal */}
      <Modal
        open={sendResultModal.open}
        onClose={() => setSendResultModal({ open: false })}
        title="Send psychological test result"
        subtitle="Deliver result summary and recommendations to the student."
        size="2xl"
        align="top"
        footer={
          <>
            <button type="button" onClick={() => setSendResultModal({ open: false })} className={BTN.secondary}>
              Cancel
            </button>
            <button type="submit" form="send-result-form" className={BTN.primary}>
              Send to student
            </button>
          </>
        }
      >
        <form id="send-result-form" onSubmit={handleSendResult} className="space-y-3">
          <div>
            <label className={LABEL}>Select student test *</label>
            <select
              required
              className={INPUT}
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
              <option value="">— Select a completed test —</option>
              {completedTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.studentName} — {t.testType} ({t.scheduledDate || t.preferredDate})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Test name *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={resultForm.testName}
              onChange={(e) => setResultForm({ ...resultForm, testName: e.target.value })}
              placeholder="e.g. Career Interest Inventory"
            />
          </div>
          <div>
            <label className={LABEL}>Completed date *</label>
            <input
              type="date"
              required
              className={INPUT}
              value={resultForm.completedDate}
              onChange={(e) => setResultForm({ ...resultForm, completedDate: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Summary / results *</label>
            <textarea
              rows={5}
              required
              className={INPUT}
              value={resultForm.summary}
              onChange={(e) => setResultForm({ ...resultForm, summary: e.target.value })}
              placeholder="Brief summary of test results and findings…"
            />
          </div>
          <div>
            <label className={LABEL}>Recommendations</label>
            <textarea
              rows={4}
              className={INPUT}
              value={resultForm.recommendations}
              onChange={(e) => setResultForm({ ...resultForm, recommendations: e.target.value })}
              placeholder="Recommended actions or next steps…"
            />
          </div>
        </form>
      </Modal>

      {sendReportModal.open && (
        <SendReportModal
          token={token}
          currentUser={currentUser}
          filters={filters}
          counselingAppointments={counselingAppointments}
          myTests={myTests}
          onClose={() => setSendReportModal({ open: false })}
        />
      )}
    </div>
  );
}

function SendReportModal({ token, currentUser, filters, counselingAppointments, myTests, onClose }) {
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState(
    `Counseling report from ${currentUser?.name || "Counselor"} — ${new Date().toLocaleDateString()}`
  );
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingRecipients(true);
    fetch(`${API_BASE}/api/users?role=college_rep`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json().then((body) => ({ res, body })))
      .then(({ res, body }) => {
        if (!res.ok) {
          setError(body.message || "Unable to load recipients");
          return;
        }
        const list = Array.isArray(body) ? body : body.items || [];
        setRecipients(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingRecipients(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!recipientId) {
      setError("Pick a recipient");
      return;
    }
    setSubmitting(true);
    try {
      const statuses = counselingAppointments.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {});
      const payload = {
        filters,
        totals: {
          counselingAppointments: counselingAppointments.length,
          tests: myTests.length,
        },
        appointmentStatuses: statuses,
        generatedAt: new Date().toISOString(),
        counselorName: currentUser?.name,
      };

      const res = await fetch(`${API_BASE}/api/reports/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: Number(recipientId),
          title: title.trim(),
          summary: summary.trim() || null,
          payload,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Send failed");
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Send counseling report to College Dean"
      subtitle="Includes current filters, counts, and status breakdown."
      size="xl"
      align="top"
      footer={
        done ? (
          <button onClick={onClose} className={BTN.primary}>
            Close
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Cancel
            </button>
            <button type="submit" form="send-report-form" disabled={submitting} className={BTN.primary}>
              {submitting ? "Sending…" : "Send report"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
          Report sent. The recipient has been notified.
        </div>
      ) : (
        <form id="send-report-form" onSubmit={submit} className="space-y-3">
          <div>
            <label className={LABEL}>Recipient *</label>
            <select
              required
              className={INPUT}
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              disabled={loadingRecipients}
            >
              <option value="">
                {loadingRecipients ? "Loading…" : "Select a College Dean"}
              </option>
              {recipients.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.college ? `· ${u.college}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Title *</label>
            <input
              required
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Summary</label>
            <textarea
              rows={4}
              className={INPUT}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional cover note. Current filters and counts will be attached automatically."
            />
          </div>
          <p className="text-xs text-gray-500">
            Attached: filters in use, counseling counts, status breakdown, test counts.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
