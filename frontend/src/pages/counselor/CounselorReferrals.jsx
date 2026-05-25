import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralsContext";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Inbox,
  Send,
  Plus,
  History,
} from "lucide-react";
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

export default function CounselorReferrals() {
  const { currentUser, token } = useAuth();
  const { referrals, loading, error, fetchReferrals, decideReferral, cancelReferral } =
    useReferrals();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incoming");
  const [newOpen, setNewOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState({ open: false, referral: null, status: null });
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const incomingPending = useMemo(
    () =>
      referrals.filter(
        (r) => r.receiving_counselor_id === currentUser?.id && r.status === "pending"
      ),
    [referrals, currentUser?.id]
  );
  const outgoingPending = useMemo(
    () =>
      referrals.filter(
        (r) => r.referring_counselor_id === currentUser?.id && r.status === "pending"
      ),
    [referrals, currentUser?.id]
  );
  const history = useMemo(
    () => referrals.filter((r) => r.status !== "pending"),
    [referrals]
  );

  const filtered = activeTab === "incoming" ? incomingPending : activeTab === "outgoing" ? outgoingPending : history;

  const openDecision = (referral, status) => {
    setDecisionModal({ open: true, referral, status });
    setDecisionNote("");
    setDecisionError("");
  };

  const submitDecision = async () => {
    const { referral, status } = decisionModal;
    if (status === "rejected" && !decisionNote.trim()) {
      setDecisionError("A note is required when rejecting.");
      return;
    }
    setDecisionBusy(true);
    const res = await decideReferral(referral.id, { status, decisionNote: decisionNote.trim() || null });
    setDecisionBusy(false);
    if (!res.success) {
      setDecisionError(res.message || "Failed");
      return;
    }
    setDecisionModal({ open: false, referral: null, status: null });
    if (status === "accepted") {
      navigate(`/counselor/referrals/${referral.id}/confirmation`);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this referral?")) return;
    await cancelReferral(id);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Referrals"
        subtitle="Hand off students between counselors with a tracked decision."
        actions={
          <button onClick={() => setNewOpen(true)} className={BTN.primary}>
            <Plus size={15} /> New referral
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <TabBtn
          active={activeTab === "incoming"}
          onClick={() => setActiveTab("incoming")}
          icon={<Inbox size={14} />}
          count={incomingPending.length}
        >
          Incoming
        </TabBtn>
        <TabBtn
          active={activeTab === "outgoing"}
          onClick={() => setActiveTab("outgoing")}
          icon={<Send size={14} />}
          count={outgoingPending.length}
        >
          Outgoing
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
        title={
          activeTab === "incoming"
            ? "Incoming referrals"
            : activeTab === "outgoing"
            ? "Outgoing referrals"
            : "Referral history"
        }
        subtitle={
          activeTab === "history"
            ? "Past decisions and cancelled referrals"
            : "Pending action"
        }
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === "incoming" ? Inbox : activeTab === "outgoing" ? Send : History}
            title={
              activeTab === "incoming"
                ? "No incoming referrals"
                : activeTab === "outgoing"
                ? "No outgoing referrals"
                : "No history yet"
            }
            hint={
              activeTab === "incoming"
                ? "When another counselor hands off a student to you, it will appear here."
                : activeTab === "outgoing"
                ? "Use “New referral” to hand off a student to another counselor."
                : "Resolved referrals (accepted, rejected, or cancelled) will collect here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">{activeTab === "outgoing" ? "Sent to" : "From"}</th>
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
                        <div className="w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
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
                    <td className="px-4 py-3 text-gray-700">
                      {activeTab === "outgoing"
                        ? r.receivingCounselorName
                        : r.referringCounselorName}
                    </td>
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
                      {activeTab === "incoming" && r.status === "pending" && (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openDecision(r, "accepted")}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
                          >
                            <CheckCircle2 size={13} /> Accept
                          </button>
                          <button
                            onClick={() => openDecision(r, "rejected")}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      )}
                      {activeTab === "outgoing" && r.status === "pending" && (
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

      <Modal
        open={decisionModal.open}
        onClose={() => setDecisionModal({ open: false, referral: null, status: null })}
        title={decisionModal.status === "accepted" ? "Accept referral" : "Reject referral"}
        subtitle={
          decisionModal.status === "accepted"
            ? "Confirm you can take over this student. The referring counselor will be notified."
            : "Add a short note explaining why this referral was declined. Required."
        }
        danger={decisionModal.status === "rejected"}
        footer={
          <>
            <button
              className={BTN.secondary}
              onClick={() => setDecisionModal({ open: false, referral: null, status: null })}
            >
              Cancel
            </button>
            <button
              onClick={submitDecision}
              disabled={decisionBusy}
              className={decisionModal.status === "accepted" ? BTN.success : BTN.danger}
            >
              {decisionBusy
                ? "Submitting…"
                : decisionModal.status === "accepted"
                ? "Confirm accept"
                : "Confirm reject"}
            </button>
          </>
        }
      >
        {decisionModal.referral && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3 text-sm space-y-1">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                  Student
                </span>
                <div className="text-gray-900">{decisionModal.referral.studentName}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                  From
                </span>
                <div className="text-gray-900">{decisionModal.referral.referringCounselorName}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                  Reason
                </span>
                <div className="text-gray-700 text-sm">{decisionModal.referral.reason}</div>
              </div>
            </div>
            <label className={LABEL}>
              {decisionModal.status === "accepted" ? "Note (optional)" : "Note (required)"}
            </label>
            <textarea
              rows={3}
              className={INPUT}
              placeholder={
                decisionModal.status === "accepted"
                  ? "e.g. estimated first session date"
                  : "e.g. caseload full, scope mismatch…"
              }
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            {decisionError && <p className="text-sm text-red-600 mt-2">{decisionError}</p>}
          </>
        )}
      </Modal>

      {newOpen && (
        <NewReferralModal
          token={token}
          currentUser={currentUser}
          onClose={() => setNewOpen(false)}
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

function NewReferralModal({ token, currentUser, onClose, onCreated }) {
  const [students, setStudents] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [studentId, setStudentId] = useState("");
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
        setStudents(Array.isArray(stu) ? stu : []);
        setCounselors((Array.isArray(cou) ? cou : []).filter((c) => c.id !== currentUser?.id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLists(false));
  }, [token, currentUser?.id]);

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
      subtitle="Hand off a student to another counselor with a reason for the decision."
      size="lg"
      align="top"
      footer={
        <>
          <button type="button" onClick={onClose} className={BTN.secondary}>
            Cancel
          </button>
          <button type="submit" form="new-referral-form" disabled={submitting} className={BTN.primary}>
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
            placeholder="Why are you handing off this student?"
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
