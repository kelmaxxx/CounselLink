import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Info, Send, History } from "lucide-react";
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

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function RequestStudentData() {
  const { token, currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [counselors, setCounselors] = useState([]);
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [form, setForm] = useState({
    counselorId: "",
    studentName: searchParams.get("studentName") || "",
    studentIdentifier: searchParams.get("studentIdentifier") || "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Drop the prefill params from the URL once they've been applied so a
  // refresh does not re-stuff the form after the user clears it.
  useEffect(() => {
    if (searchParams.get("studentName") || searchParams.get("studentIdentifier")) {
      const next = new URLSearchParams(searchParams);
      next.delete("studentName");
      next.delete("studentIdentifier");
      setSearchParams(next, { replace: true });
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoadingCounselors(true);
    fetch(`${API_BASE}/api/users?role=counselor`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setCounselors(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCounselors(false));
  }, [token]);

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

  useEffect(() => {
    loadRequests();
  }, [token]);

  const myRequests = useMemo(
    () => requests.filter((r) => r.requester_id === currentUser?.id),
    [requests, currentUser?.id]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.counselorId || !form.studentName.trim() || !form.reason.trim()) {
      setError("Counselor, student name, and reason are required.");
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
          counselorId: Number(form.counselorId),
          studentName: form.studentName.trim(),
          studentIdentifier: form.studentIdentifier.trim() || null,
          reason: form.reason.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Failed");
      } else {
        setSubmitted(true);
        setForm({ counselorId: "", studentName: "", studentIdentifier: "", reason: "" });
        setTimeout(() => setSubmitted(false), 3000);
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
        eyebrow="College Representative"
        title="Request a report from a counselor"
        subtitle="Submit a formal report request. The counselor reviews and responds."
        actions={
          <button type="submit" form="request-report-form" className={BTN.primary}>
            <Send size={14} /> Submit request
          </button>
        }
      />

      {submitted && (
        <div className="mb-4 px-3 py-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          Request submitted. The counselor has been notified.
        </div>
      )}

      <SectionCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList size={14} className="text-maroon-600" /> Request details
          </span>
        }
        subtitle="Pick the counselor and describe what you need"
        className="mb-4"
      >
        <form id="request-report-form" onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>Counselor *</label>
            <select
              required
              className={INPUT}
              value={form.counselorId}
              onChange={(e) => setForm({ ...form, counselorId: e.target.value })}
              disabled={loadingCounselors}
            >
              <option value="">
                {loadingCounselors ? "Loading…" : "Select a counselor"}
              </option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.department ? `· ${c.department}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Student name *</label>
            <input
              type="text"
              required
              className={INPUT}
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Student ID</label>
            <input
              type="text"
              className={INPUT}
              value={form.studentIdentifier}
              onChange={(e) => setForm({ ...form, studentIdentifier: e.target.value })}
              placeholder="Optional — helps the counselor identify the student"
            />
          </div>
          <div>
            <label className={LABEL}>Reason for request *</label>
            <textarea
              required
              rows={4}
              className={INPUT}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Explain why you need this report…"
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
          The counselor will review your request and respond. You will receive a notification when
          it is fulfilled or declined.
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Counselor</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.student_name}</div>
                      {r.student_identifier && (
                        <div className="text-xs text-gray-500 tabular-nums">
                          {r.student_identifier}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.counselorName}</td>
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
        )}
      </SectionCard>
    </div>
  );
}
