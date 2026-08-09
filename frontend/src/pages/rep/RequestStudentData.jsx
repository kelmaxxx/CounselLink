import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Info, Send, History, User, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";
import { getDepartments } from "../../data/msuColleges";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const REQUESTS_PAGE_SIZE = 10;

export default function RequestStudentData() {
  const { token, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [form, setForm] = useState({
    requestType: "individual",
    studentId: searchParams.get("studentId") || "",
    department: "",
    reason: "",
  });
  const isCollege = form.requestType === "college";
  const isDepartment = form.requestType === "department";
  const isIndividual = form.requestType === "individual";
  const myDepartments = getDepartments(currentUser?.college);

  // Student search combobox
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSuggestOpen, setStudentSuggestOpen] = useState(false);
  const studentRef = useRef(null);

  // Pagination for "My requests"
  const [requestsPage, setRequestsPage] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Drop the prefill param from the URL once applied.
  useEffect(() => {
    if (searchParams.get("studentId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("studentId");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close student suggestions on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (studentRef.current && !studentRef.current.contains(e.target)) {
        setStudentSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoadingStudents(true);
    fetch(`${API_BASE}/api/users?role=student`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingStudents(false));
  }, [token]);

  // When students load, pre-fill search text if form has a prefilled studentId
  useEffect(() => {
    if (!form.studentId || !students.length) return;
    const found = students.find((s) => String(s.id) === String(form.studentId));
    if (found) setStudentSearch(`${found.name}${found.studentId ? ` · ${found.studentId}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const loadRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setRequests(Array.isArray(data) ? data : []);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => { loadRequests(); }, [token]);

  const myRequests = useMemo(
    () => requests.filter((r) => r.requester_id === currentUser?.id),
    [requests, currentUser?.id]
  );

  const totalRequestPages = Math.max(1, Math.ceil(myRequests.length / REQUESTS_PAGE_SIZE));
  const pagedRequests = myRequests.slice(
    (requestsPage - 1) * REQUESTS_PAGE_SIZE,
    requestsPage * REQUESTS_PAGE_SIZE
  );

  // Student search suggestions (max 10)
  const studentMatches = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.studentId || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [studentSearch, students]);

  const selectStudent = (s) => {
    setForm((f) => ({ ...f, studentId: String(s.id) }));
    setStudentSearch(`${s.name}${s.studentId ? ` · ${s.studentId}` : ""}`);
    setStudentSuggestOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.reason.trim()) {
      setError("Reason is required.");
      return;
    }
    if (isIndividual && !form.studentId) {
      setError("Please select a student from the suggestions.");
      return;
    }
    if (isDepartment && !form.department) {
      setError("Department is required for a department summary request.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/report-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType: form.requestType,
          studentId: isIndividual ? Number(form.studentId) : null,
          department: isDepartment ? form.department : null,
          reason: form.reason.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Failed");
      } else {
        setSubmitted(
          isIndividual
            ? body.status === "fulfilled"
              ? "Request fulfilled — the report is now available to you."
              : "Request resolved — see the status and note below."
            : true
        );
        setForm({ requestType: form.requestType, studentId: "", department: "", reason: "" });
        setStudentSearch("");
        setRequestsPage(1);
        setTimeout(() => setSubmitted(false), 4000);
        await loadRequests();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="College"
        title="Request a report from a counselor"
        subtitle="Request an individual student session report, or a college-wide summary. The counselor reviews, generates, and responds."
      />

      {submitted && (
        <div className="mb-4 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {typeof submitted === "string" ? submitted : "Request submitted. All counselors have been notified."}
        </div>
      )}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList size={14} className="text-maroon-600" /> Request details
          </span>
        }
        subtitle="Describe what you need — the request is sent to all counselors"
        className="mb-4"
      >
        <form id="request-report-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>Request type *</label>
            <select
              className={INPUT}
              value={form.requestType}
              onChange={(e) => setForm({ ...form, requestType: e.target.value })}
            >
              <option value="individual">Individual student — session report for one specific student</option>
              <option value="department">Specific department — summary scoped to one department</option>
              <option value="college">Whole college — college-wide summary, no individual records</option>
            </select>
          </div>

          {isIndividual && (
            <div>
              <label className={LABEL}>Student *</label>
              <div className="relative" ref={studentRef}>
                <input
                  type="text"
                  autoComplete="off"
                  className={INPUT}
                  value={studentSearch}
                  disabled={loadingStudents}
                  placeholder={loadingStudents ? "Loading students…" : "Type name or student ID to search…"}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setForm((f) => ({ ...f, studentId: "" }));
                    setStudentSuggestOpen(true);
                  }}
                  onFocus={() => { if (studentSearch.trim()) setStudentSuggestOpen(true); }}
                />
                {studentSuggestOpen && studentMatches.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {studentMatches.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => selectStudent(s)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-left text-sm transition"
                        >
                          <span className="font-medium text-gray-900">{s.name}</span>
                          {s.studentId && (
                            <span className="text-xs text-gray-400 tabular-nums ml-2 shrink-0">
                              {s.studentId}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {studentSuggestOpen && studentSearch.trim() && studentMatches.length === 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-sm text-gray-500">
                    No students match "{studentSearch}"
                  </div>
                )}
              </div>
              {form.studentId && (
                <p className="text-xs text-emerald-600 mt-1">Student selected.</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                A student session data may only released if this student allowed it.
              </p>
            </div>
          )}

          {isDepartment && (
            <div>
              <label className={LABEL}>Department *</label>
              <select
                required={isDepartment}
                className={INPUT}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select a department</option>
                {myDepartments.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The counselor generates an anonymized summary scoped to this department
                {currentUser?.college ? ` in ${currentUser.college}` : ""} — useful for
                per-department accreditation.
              </p>
            </div>
          )}

          <div>
            <label className={LABEL}>Reason for request *</label>
            <textarea
              required
              rows={4}
              className={INPUT}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder={
                isCollege
                  ? "Explain what college-wide summary you need…"
                  : isDepartment
                  ? "Explain what department summary you need…"
                  : "Explain why you need this report…"
              }
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="pt-1">
            <button type="submit" disabled={submitting} className={BTN.primary}>
              <Send size={14} /> {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </SectionCard>

      <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-800 mb-6">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          All counselors will see your request. The first to respond will fulfill or decline it — you
          will receive a notification when that happens.
        </p>
      </div>

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <History size={14} className="text-maroon-600" /> My requests
          </span>
        }
        subtitle={`${myRequests.length} total`}
        noBodyPadding
      >
        {loadingRequests ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : myRequests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No requests yet"
            hint="Submitted requests will appear here with their status."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Counselor</th>
                    <th className="px-4 py-2.5">Reason</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3">
                        {r.request_type === "college" ? (
                          <div className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                            <Building2 size={13} className="text-maroon-600" />
                            College-wide summary
                          </div>
                        ) : r.request_type === "department" ? (
                          <div className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                            <ClipboardList size={13} className="text-maroon-600" />
                            {r.department || "Department"} summary
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900">{r.student_name}</div>
                            {r.student_identifier && (
                              <div className="text-xs text-gray-500 tabular-nums">
                                {r.student_identifier}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.status === "pending" ? (
                          <span className="text-gray-400 italic text-xs">To Be Reviewed</span>
                        ) : r.counselorName ? (
                          r.counselorName
                        ) : (
                          <span className="text-gray-400 italic text-xs">No Data</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <p className="text-gray-700 line-clamp-2">{r.reason}</p>
                        {r.response_note && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-medium">Note:</span> {r.response_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              <span>
                {myRequests.length === 0
                  ? "0 requests"
                  : `${(requestsPage - 1) * REQUESTS_PAGE_SIZE + 1}–${Math.min(requestsPage * REQUESTS_PAGE_SIZE, myRequests.length)} of ${myRequests.length}`}
              </span>
              <div className="inline-flex gap-1">
                <button
                  onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                  disabled={requestsPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setRequestsPage((p) => Math.min(totalRequestPages, p + 1))}
                  disabled={requestsPage >= totalRequestPages}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
