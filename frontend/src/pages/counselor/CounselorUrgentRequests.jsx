import React, { useEffect, useMemo, useState } from "react";
import { useUrgentRequests } from "../../context/UrgentRequestsContext";
import { CheckCircle2, AlertTriangle, Clock, History } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  initialsOf,
  formatDateTime,
} from "../../components/ui";

export default function CounselorUrgentRequests() {
  const { requests, loading, error, fetchRequests, resolveRequest } = useUrgentRequests();
  const [activeTab, setActiveTab] = useState("pending");
  const [resolveModal, setResolveModal] = useState({ open: false, request: null });
  const [resolveError, setResolveError] = useState("");
  const [resolveBusy, setResolveBusy] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const resolved = useMemo(() => requests.filter((r) => r.status === "resolved"), [requests]);

  const filtered = activeTab === "pending" ? pending : resolved;

  const openResolve = (request) => {
    setResolveModal({ open: true, request });
    setResolveError("");
  };

  const submitResolve = async () => {
    setResolveBusy(true);
    const res = await resolveRequest(resolveModal.request.id);
    setResolveBusy(false);
    if (!res.success) {
      setResolveError(res.message || "Failed");
      return;
    }
    setResolveModal({ open: false, request: null });
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title={
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" /> Urgent Requests
          </span>
        }
        subtitle="Urgent counseling requests submitted from the login page."
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
        <TabBtn
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          icon={<Clock size={14} />}
          count={pending.length}
        >
          Pending
        </TabBtn>
        <TabBtn
          active={activeTab === "resolved"}
          onClick={() => setActiveTab("resolved")}
          icon={<History size={14} />}
          count={resolved.length}
        >
          Resolved
        </TabBtn>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <SectionCard
        title={activeTab === "pending" ? "Pending requests" : "Resolved requests"}
        subtitle={
          activeTab === "pending"
            ? "Awaiting counselor assistance"
            : "Previously handled urgent requests"
        }
        noBodyPadding
      >
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === "pending" ? AlertTriangle : History}
            title={activeTab === "pending" ? "No pending requests" : "No resolved requests yet"}
            hint={
              activeTab === "pending"
                ? "Urgent requests submitted from the login page will appear here."
                : "Requests you mark as resolved will collect here."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">College</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Nature of Concern</th>
                  <th className="px-4 py-2.5">Description</th>
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
                        <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {initialsOf(r.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {r.fullName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            ID: {r.studentIdNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.college}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.contactNumber}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-700">{r.natureOfConcern}</p>
                      {r.natureOfConcernOther && (
                        <p className="text-xs text-gray-500 mt-0.5">{r.natureOfConcernOther}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-gray-700 line-clamp-2">{r.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                      {r.status === "resolved" && r.resolvedByName && (
                        <div className="text-xs text-gray-500 mt-1">by {r.resolvedByName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" && (
                        <button
                          onClick={() => openResolve(r)}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
                        >
                          <CheckCircle2 size={13} /> Mark Resolved
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
        open={resolveModal.open}
        onClose={() => setResolveModal({ open: false, request: null })}
        title="Mark request as resolved"
        subtitle="This will clear the pending state for this student ID, allowing a future urgent request to notify counselors again."
        footer={
          <>
            <button
              className={BTN.secondary}
              onClick={() => setResolveModal({ open: false, request: null })}
            >
              Cancel
            </button>
            <button onClick={submitResolve} disabled={resolveBusy} className={BTN.success}>
              {resolveBusy ? "Submitting…" : "Confirm resolve"}
            </button>
          </>
        }
      >
        {resolveModal.request && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm space-y-1">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                Student
              </span>
              <div className="text-gray-900">
                {resolveModal.request.fullName} ({resolveModal.request.studentIdNumber})
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                Nature of Concern
              </span>
              <div className="text-gray-700">
                {resolveModal.request.natureOfConcern}
                {resolveModal.request.natureOfConcernOther
                  ? ` - ${resolveModal.request.natureOfConcernOther}`
                  : ""}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">
                Description
              </span>
              <div className="text-gray-700">{resolveModal.request.description}</div>
            </div>
          </div>
        )}
        {resolveError && <p className="text-sm text-red-600 mt-2">{resolveError}</p>}
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
