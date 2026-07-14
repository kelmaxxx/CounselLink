import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralsContext";
import { CheckCircle2, XCircle, Inbox, History } from "lucide-react";
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
  Pagination,
} from "../../components/ui";

const TIME_LABEL = {
  "9:00-10:00": "9:00 – 10:00 AM",
  "10:00-11:00": "10:00 – 11:00 AM",
  "11:00-12:00": "11:00 – 12:00 PM",
  "1:00-2:00": "1:00 – 2:00 PM",
  "2:00-3:00": "2:00 – 3:00 PM",
  "3:00-4:00": "3:00 – 4:00 PM",
};

export default function CounselorReferrals() {
  const { currentUser } = useAuth();
  const { referrals, loading, error, fetchReferrals, decideReferral } = useReferrals();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incoming");
  const [incomingPage, setIncomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [decisionModal, setDecisionModal] = useState({ open: false, referral: null, status: null });
  const [decisionNote, setDecisionNote] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const incomingPending = useMemo(
    () =>
      referrals.filter(
        (r) =>
          (r.receiving_counselor_id === null || r.receiving_counselor_id === currentUser?.id) &&
          r.status === "pending"
      ),
    [referrals, currentUser?.id]
  );
  const history = useMemo(
    () => referrals.filter((r) => r.status !== "pending"),
    [referrals]
  );

  const REFERRALS_PER_PAGE = 10;
  const filtered = activeTab === "incoming" ? incomingPending : history;
  const currentPage = activeTab === "incoming" ? incomingPage : historyPage;
  const setCurrentPage = activeTab === "incoming" ? setIncomingPage : setHistoryPage;
  const pagedReferrals = filtered.slice((currentPage - 1) * REFERRALS_PER_PAGE, currentPage * REFERRALS_PER_PAGE);

  const openDecision = (referral, status) => {
    setDecisionModal({ open: true, referral, status });
    setDecisionNote("");
    setScheduledDate("");
    setScheduledTime("");
    setDecisionError("");
  };

  const submitDecision = async () => {
    const { referral, status } = decisionModal;
    if (status === "rejected" && !decisionNote.trim()) {
      setDecisionError("A note is required when declining.");
      return;
    }
    if (status === "accepted" && (!scheduledDate || !scheduledTime)) {
      setDecisionError("Please pick a date and time slot for the appointment.");
      return;
    }
    setDecisionBusy(true);
    const res = await decideReferral(referral.id, {
      status,
      decisionNote: decisionNote.trim() || null,
      scheduledDate: status === "accepted" ? scheduledDate : null,
      scheduledTime: status === "accepted" ? scheduledTime : null,
    });
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

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Referrals"
        subtitle="Review students referred to you by Colleges."
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <TabBtn
          active={activeTab === "incoming"}
          onClick={() => { setActiveTab("incoming"); setIncomingPage(1); }}
          icon={<Inbox size={14} />}
          count={incomingPending.length}
        >
          Incoming
        </TabBtn>
        <TabBtn
          active={activeTab === "history"}
          onClick={() => { setActiveTab("history"); setHistoryPage(1); }}
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
        title={activeTab === "incoming" ? "Incoming referrals" : "Referral history"}
        subtitle={
          activeTab === "history"
            ? "Past decisions and cancelled referrals"
            : "Awaiting your decision"
        }
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === "incoming" ? Inbox : History}
            title={activeTab === "incoming" ? "No incoming referrals" : "No history yet"}
            hint={
              activeTab === "incoming"
                ? "When a College refers a student to you, it will appear here."
                : "Resolved referrals (accepted or declined) will collect here."
            }
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Referred by</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedReferrals.map((r) => (
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
                    <td className="px-4 py-3 text-gray-700">
                      <div>{r.referrerName}</div>
                      {r.referrerCollege && (
                        <div className="text-xs text-gray-500">{r.referrerCollege}</div>
                      )}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={Math.ceil(filtered.length / REFERRALS_PER_PAGE)}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </SectionCard>

      <Modal
        open={decisionModal.open}
        onClose={() => setDecisionModal({ open: false, referral: null, status: null })}
        title={decisionModal.status === "accepted" ? "Accept referral" : "Reject referral"}
        subtitle={
          decisionModal.status === "accepted"
            ? "Set the appointment date and time slot. The student and the referring College will be notified."
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
                  Referred by
                </span>
                <div className="text-gray-900">{decisionModal.referral.referrerName}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                  Reason
                </span>
                <div className="text-gray-700 text-sm">{decisionModal.referral.reason}</div>
              </div>
            </div>

            {decisionModal.status === "accepted" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={LABEL}>Appointment date *</label>
                  <input
                    type="date"
                    className={INPUT}
                    value={scheduledDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL}>Time slot *</label>
                  <select
                    className={INPUT}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  >
                    <option value="">Select a slot</option>
                    {Object.entries(TIME_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <label className={LABEL}>
              {decisionModal.status === "accepted" ? "Note (optional)" : "Note (required)"}
            </label>
            <textarea
              rows={3}
              className={INPUT}
              placeholder={
                decisionModal.status === "accepted"
                  ? "e.g. Confirmation message, instructions for the student…"
                  : "e.g. caseload full, scope mismatch…"
              }
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
            {decisionError && <p className="text-sm text-red-600 mt-2">{decisionError}</p>}
          </>
        )}
      </Modal>
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
