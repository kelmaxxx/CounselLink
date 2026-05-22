import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralsContext";
import { ArrowRight, CheckCircle2, XCircle, Inbox, Send, Plus, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const statusPill = (status) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-200 text-gray-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
};

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

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    if (activeTab === "incoming") {
      return referrals.filter(
        (r) => r.receiving_counselor_id === currentUser.id && r.status === "pending"
      );
    }
    if (activeTab === "outgoing") {
      return referrals.filter(
        (r) => r.referring_counselor_id === currentUser.id && r.status === "pending"
      );
    }
    // history
    return referrals.filter((r) => r.status !== "pending");
  }, [referrals, activeTab, currentUser]);

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Referrals</h2>
          <p className="text-sm text-gray-600">Hand off students between counselors with a tracked decision.</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
        >
          <Plus size={16} /> New Referral
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <TabBtn active={activeTab === "incoming"} onClick={() => setActiveTab("incoming")} icon={<Inbox size={16} />}>
          Incoming
        </TabBtn>
        <TabBtn active={activeTab === "outgoing"} onClick={() => setActiveTab("outgoing")} icon={<Send size={16} />}>
          Outgoing
        </TabBtn>
        <TabBtn active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={<ArrowRight size={16} />}>
          History
        </TabBtn>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      <div className="bg-white border border-gray-200 rounded-xl shadow overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-700">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">
                {activeTab === "outgoing" ? "Sent to" : "From"}
              </th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No referrals in this view.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.studentName}</div>
                    <div className="text-xs text-gray-500">{r.studentCollege || r.studentEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {activeTab === "outgoing" ? r.receivingCounselorName : r.referringCounselorName}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-sm">
                    <p className="line-clamp-2">{r.reason}</p>
                    {r.decision_note && (
                      <p className="text-xs text-gray-500 mt-1">Note: {r.decision_note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusPill(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {activeTab === "incoming" && r.status === "pending" && (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openDecision(r, "accepted")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                        >
                          <CheckCircle2 size={14} /> Accept
                        </button>
                        <button
                          onClick={() => openDecision(r, "rejected")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                    {activeTab === "outgoing" && r.status === "pending" && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="px-2.5 py-1 rounded border border-gray-300 text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {decisionModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">
              {decisionModal.status === "accepted" ? "Accept Referral" : "Reject Referral"}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {decisionModal.status === "accepted"
                ? "Confirm you can take over this student. The referring counselor will be notified."
                : "Add a short note explaining why this referral was declined. Required."}
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3 text-sm">
              <p><strong>Student:</strong> {decisionModal.referral.studentName}</p>
              <p><strong>From:</strong> {decisionModal.referral.referringCounselorName}</p>
              <p className="mt-1"><strong>Reason:</strong> {decisionModal.referral.reason}</p>
            </div>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-maroon-500"
              placeholder={
                decisionModal.status === "accepted"
                  ? "Optional note (e.g. estimated first session date)"
                  : "Required: e.g. caseload full, scope mismatch..."
              }
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            {decisionError && <p className="text-sm text-red-600 mt-2">{decisionError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDecisionModal({ open: false, referral: null, status: null })}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitDecision}
                disabled={decisionBusy}
                className={`px-3 py-2 text-white rounded disabled:opacity-60 ${
                  decisionModal.status === "accepted"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {decisionBusy
                  ? "Submitting..."
                  : decisionModal.status === "accepted"
                  ? "Confirm Accept"
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {newOpen && <NewReferralModal token={token} currentUser={currentUser} onClose={() => setNewOpen(false)} onCreated={() => fetchReferrals()} />}
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition inline-flex items-center gap-2 ${
        active ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {icon}
      {children}
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
      fetch(`${API_BASE}/api/users?role=student`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.json()
      ),
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
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New Referral</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
            <select
              required
              className="w-full border rounded px-3 py-2"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loadingLists}
            >
              <option value="">{loadingLists ? "Loading..." : "Select a student"}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.college ? `· ${s.college}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refer to counselor *</label>
            <select
              required
              className="w-full border rounded px-3 py-2"
              value={receivingCounselorId}
              onChange={(e) => setReceivingCounselorId(e.target.value)}
              disabled={loadingLists}
            >
              <option value="">{loadingLists ? "Loading..." : "Select a counselor"}</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.department ? `· ${c.department}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              required
              rows={3}
              className="w-full border rounded px-3 py-2"
              placeholder="Why are you handing off this student?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full border rounded px-3 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Referral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
