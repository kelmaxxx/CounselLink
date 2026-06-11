import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralsContext";
import { Send, Plus, History, ArrowRightLeft } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
} from "../../components/ui";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function RepReferrals() {
  const { currentUser, token } = useAuth();
  const { referrals, loading, error, fetchReferrals, cancelReferral } = useReferrals();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetStudentId = searchParams.get("studentId") || "";
  const [activeTab, setActiveTab] = useState("pending");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Auto-open the New Referral modal when the user arrives from the
  // Counseling Data page with a preselected student.
  useEffect(() => {
    if (presetStudentId) setNewOpen(true);
  }, [presetStudentId]);

  const handleCloseNew = () => {
    setNewOpen(false);
    if (presetStudentId) {
      // Drop the prefill param so refreshing the page does not re-open the modal.
      const next = new URLSearchParams(searchParams);
      next.delete("studentId");
      setSearchParams(next, { replace: true });
    }
  };

  const myReferrals = useMemo(
    () => referrals.filter((r) => r.referrer_id === currentUser?.id),
    [referrals, currentUser?.id]
  );
  const pending = useMemo(
    () => myReferrals.filter((r) => r.status === "pending"),
    [myReferrals]
  );
  const history = useMemo(
    () => myReferrals.filter((r) => r.status !== "pending"),
    [myReferrals]
  );
  const filtered = activeTab === "pending" ? pending : history;

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this referral?")) return;
    await cancelReferral(id);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="College Representative"
        title="Referrals"
        subtitle="Refer students from your college to a counselor."
        actions={
          <button onClick={() => setNewOpen(true)} className={BTN.primary}>
            <Plus size={15} /> New referral
          </button>
        }
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <TabBtn
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          icon={<Send size={14} />}
          count={pending.length}
        >
          Pending
        </TabBtn>
        <TabBtn
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={<History size={14} />}
          count={history.length}
        >
          History
        </TabBtn>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        title={activeTab === "pending" ? "Pending referrals" : "Referral history"}
        subtitle={
          activeTab === "pending"
            ? "Awaiting the counselor's decision"
            : "Accepted, rescheduled, declined, or cancelled referrals"
        }
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === "pending" ? Send : History}
            title={
              activeTab === "pending" ? "No pending referrals" : "No history yet"
            }
            hint={
              activeTab === "pending"
                ? 'Use "New referral" to hand off a student to a counselor.'
                : "Resolved referrals will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Counselor</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(r.studentName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {r.studentName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.studentCollege || r.studentEmail || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.receivingCounselorName}</td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-gray-700 line-clamp-2">{r.reason}</p>
                      {r.decision_note && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">Note:</span> {r.decision_note}
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
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="inline-flex items-center h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {newOpen && (
        <NewReferralModal
          token={token}
          currentUser={currentUser}
          presetStudentId={presetStudentId}
          onClose={handleCloseNew}
          onCreated={() => fetchReferrals()}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, icon, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? "text-maroon-700 border-maroon-600"
          : "text-gray-500 border-transparent hover:text-gray-900"
      }`}
    >
      {icon}
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${
            active ? "bg-maroon-100 text-maroon-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NewReferralModal({ token, currentUser, presetStudentId, onClose, onCreated }) {
  const [students, setStudents] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [studentId, setStudentId] = useState(presetStudentId || "");
  const [receivingCounselorId, setReceivingCounselorId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoadingLists(true);
    Promise.all([
      fetch(`${API_BASE}/api/users?role=student`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${API_BASE}/api/users?role=counselor`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([stu, cou]) => {
        const studentList = Array.isArray(stu) ? stu : [];
        // Scope to the rep's own college when available.
        const scoped = currentUser?.college
          ? studentList.filter((s) => s.college === currentUser.college)
          : studentList;
        setStudents(scoped);
        setCounselors(Array.isArray(cou) ? cou : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLists(false));
  }, [token, currentUser?.college]);

  // If the page passed a presetStudentId but the list loads later, keep the
  // selection sticky once the matching student is present in the list.
  useEffect(() => {
    if (presetStudentId && students.some((s) => String(s.id) === String(presetStudentId))) {
      setStudentId(String(presetStudentId));
    }
  }, [presetStudentId, students]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!studentId || !receivingCounselorId || !reason.trim()) {
      setError("All required fields must be filled.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/referrals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: Number(studentId),
          receivingCounselorId: Number(receivingCounselorId),
          reason: reason.trim(),
          notes: notes.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Failed");
      } else {
        onCreated?.();
        onClose();
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
      title="New referral"
      subtitle="Refer a student from your college to a counselor."
      size="lg"
      align="top"
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            form="new-referral-form"
            disabled={submitting}
            className={BTN.primary}
          >
            {submitting ? "Sending…" : "Send referral"}
          </button>
        </>
      }
    >
      <form id="new-referral-form" onSubmit={submit} className="space-y-3">
        <div>
          <label className={LABEL}>Student *</label>
          <select
            required
            className={INPUT}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={loadingLists}
          >
            <option value="">{loadingLists ? "Loading…" : "Select a student"}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.college ? `· ${s.college}` : ""}
              </option>
            ))}
          </select>
          {!loadingLists && students.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              No students found{currentUser?.college ? ` in ${currentUser.college}` : ""}.
            </p>
          )}
        </div>
        <div>
          <label className={LABEL}>Refer to counselor *</label>
          <select
            required
            className={INPUT}
            value={receivingCounselorId}
            onChange={(e) => setReceivingCounselorId(e.target.value)}
            disabled={loadingLists}
          >
            <option value="">{loadingLists ? "Loading…" : "Select a counselor"}</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.department ? `· ${c.department}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Reason *</label>
          <textarea
            required
            rows={3}
            className={INPUT}
            placeholder="Why are you referring this student?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Notes (optional)</label>
          <textarea
            rows={2}
            className={INPUT}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
