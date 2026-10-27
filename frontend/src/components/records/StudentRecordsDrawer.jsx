// src/components/records/StudentRecordsDrawer.jsx
// Right-side drawer that opens when a counselor clicks a student in the
// "Students" tab. Four sub-tabs:
//   - Inventory: digital MSU form + scan upload
//   - Consent:   e-sign status, signed-paper scan, revoke
//   - Sessions:  counseling sessions filtered to this student
//   - Tests:     released psychological test results for this student
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ClipboardList, FileSignature, BookOpen, ExternalLink, FileUp, ShieldOff, CheckCircle2, AlertTriangle, MessageCircle, Eye, FileDown, Edit, Trash2, MoreVertical, ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { useTestResults } from "../../context/TestResultsContext";
import { useAuth } from "../../context/AuthContext";
import InventoryForm from "./InventoryForm";
import ChatModal from "../ChatModal";
import { Modal, BTN, formatDate } from "../ui";
import { saveReportAsPdfFile } from "../../utils/sessionReport";
import { saveTestResultAsPdfFile } from "../../utils/testResultReport";
import ReportPreview from "./ReportPreview";
import { createPortal } from "react-dom";

const NEXT_LABELS = { followup: "Follow-up", termination: "Termination" };
const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function formatDateTime(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return value; }
}

function ConsentStatusBadge({ consent }) {
  if (!consent) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting consent</span>;
  if (consent.revokedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Revoked</span>;
  if (consent.eConsentSignedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">E-signed</span>;
  if (consent.scanUrl) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Paper on file</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting consent</span>;
}

function AuthorizeBadge({ inventory }) {
  const ack = inventory?.formData?.acknowledgment;
  if (!ack?.disclaimerAgreed) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting</span>;
  if (ack.disclaimerRevokedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Revoked</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">Authorized</span>;
}

const REVOCATION_TYPES = [
  { type: "consent", label: "Informed consent" },
  { type: "authorization", label: "Data authorization" },
];

function ConsentPanel({ student, consent, inventory, onConsentChanged, onUploadScan, onDeleteScan, onRevoke, onRevokeAuthorization, onRevocationDecided, readOnly }) {
  const { getRevocationRequest, decideRevocationRequest } = useStudentRecords();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmRevokeAuth, setConfirmRevokeAuth] = useState(false);
  const [confirmRemoveScan, setConfirmRemoveScan] = useState(false);
  const [scanInputKey, setScanInputKey] = useState(0);

  // Revocation request state (counselor view): one latest request per type.
  const [revRequests, setRevRequests] = useState({ consent: null, authorization: null });
  const [revRequestLoading, setRevRequestLoading] = useState(false);
  const [decideType, setDecideType] = useState(null); // "consent" | "authorization"
  const [decideAction, setDecideAction] = useState(null); // "approve" | "reject"
  const [rejectionReason, setRejectionReason] = useState("");
  const [decideBusy, setDecideBusy] = useState(false);
  const [decideFeedback, setDecideFeedback] = useState(null);

  // Load the current revocation requests for this student whenever the
  // records change (consent approval does not touch authorization, and vice versa).
  useEffect(() => {
    if (!student?.id || !consent?.eConsentSignedAt) {
      setRevRequests({ consent: null, authorization: null });
      return;
    }
    setRevRequestLoading(true);
    Promise.allSettled([
      getRevocationRequest(student.id, "consent"),
      getRevocationRequest(student.id, "authorization"),
    ])
      .then(([consentRes, authRes]) =>
        setRevRequests({
          consent: consentRes.status === "fulfilled" ? consentRes.value : null,
          authorization: authRes.status === "fulfilled" ? authRes.value : null,
        })
      )
      .finally(() => setRevRequestLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, consent?.id, consent?.revokedAt, inventory?.updatedAt]);

  const showFeedback = (type, text, ms = 3000) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), ms);
  };

  const handleScanChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const res = await onUploadScan(file);
    setBusy(false);
    setScanInputKey((k) => k + 1);
    showFeedback(res.success ? "success" : "error", res.success ? "Scan uploaded" : (res.message || "Failed"));
  };

  const handleScanDelete = async () => {
    setConfirmRemoveScan(false);
    setBusy(true);
    const res = await onDeleteScan();
    setBusy(false);
    showFeedback(res.success ? "success" : "error", res.success ? "Scan removed" : (res.message || "Failed"));
  };

  const handleRevoke = async () => {
    setConfirmRevoke(false);
    setBusy(true);
    const res = await onRevoke();
    setBusy(false);
    showFeedback(res.success ? "success" : "error", res.success ? "Consent revoked" : (res.message || "Failed"));
  };

  const handleRevokeAuthorization = async () => {
    setConfirmRevokeAuth(false);
    setBusy(true);
    const res = await onRevokeAuthorization();
    setBusy(false);
    showFeedback(res.success ? "success" : "error", res.success ? "Authorization revoked" : (res.message || "Failed"));
  };

  const handleDecide = async () => {
    const request = decideType ? revRequests[decideType] : null;
    if (!decideAction || !request?.id) return;
    if (decideAction === "reject" && !rejectionReason.trim()) {
      setDecideFeedback({ type: "error", text: "Please enter a rejection reason." });
      return;
    }
    setDecideBusy(true);
    setDecideFeedback(null);
    const res = await decideRevocationRequest(
      request.id,
      decideAction,
      decideAction === "reject" ? rejectionReason.trim() : ""
    );
    setDecideBusy(false);
    if (res.success) {
      setRevRequests((prev) => ({ ...prev, [decideType]: res.request }));
      setDecideType(null);
      setDecideAction(null);
      setRejectionReason("");
      onRevocationDecided?.();
    } else {
      setDecideFeedback({ type: "error", text: res.message || "Failed to process decision" });
    }
  };

  const scanHref = useMemo(() => {
    if (!consent?.scanUrl) return null;
    return consent.scanUrl.startsWith("http") ? consent.scanUrl : `${apiBase}${consent.scanUrl}`;
  }, [consent?.scanUrl]);

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`p-2 rounded border text-sm ${feedback.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Current consent status</h4>
          <ConsentStatusBadge consent={consent} />
        </div>

        {consent?.eConsentSignedAt && !consent.revokedAt && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5" />
            <div>
              <p>E-signed by <span className="font-medium">{consent.eConsentTypedName}</span></p>
              <p className="text-xs">on {formatDateTime(consent.eConsentSignedAt)} (IP: {consent.eConsentIp || "—"})</p>
            </div>
          </div>
        )}

        {consent?.revokedAt && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-start gap-2 mt-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <p>Revoked on {formatDateTime(consent.revokedAt)}. The student will need to consent again before resuming counseling.</p>
          </div>
        )}

        {!consent && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <p>This student has not yet provided consent. Either ask them to e-sign on their own page (Student → Informed Consent), or upload a signed scan below.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">Current authorization status</h4>
          <AuthorizeBadge inventory={inventory} />
        </div>
        {(() => {
          const ack = inventory?.formData?.acknowledgment;
          if (ack?.disclaimerAgreed && !ack.disclaimerRevokedAt) {
            return (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800 flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5" />
                <p>Student has authorized data collection under RA 10173, Data Privacy Act of 2012.</p>
              </div>
            );
          }
          if (ack?.disclaimerRevokedAt) {
            return (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <p>Authorization revoked on {formatDateTime(ack.disclaimerRevokedAt)}. The student will need to re-check the disclaimer in their inventory.</p>
              </div>
            );
          }
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <p>Student has not yet checked the data authorization disclaimer in their inventory form.</p>
            </div>
          );
        })()}
      </div>

      {!readOnly && inventory?.formData?.acknowledgment?.disclaimerAgreed && !inventory?.formData?.acknowledgment?.disclaimerRevokedAt && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ShieldOff size={18} className="text-red-600" /> Revoke authorization
          </h4>
          <p className="text-sm text-gray-600 mb-3">Use this only if the student has formally withdrawn their data authorization. They can re-authorize by re-checking the disclaimer in their inventory.</p>
          <button disabled={busy} onClick={() => setConfirmRevokeAuth(true)} className="px-4 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
            Revoke authorization
          </button>
        </div>
      )}

      {!readOnly && consent?.eConsentSignedAt && !consent.revokedAt && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ShieldOff size={18} className="text-red-600" /> Revoke consent
          </h4>
          <p className="text-sm text-gray-600 mb-3">Use this only if the student has formally withdrawn consent. They can re-sign anytime.</p>
          <button disabled={busy} onClick={() => setConfirmRevoke(true)} className="px-4 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
            Revoke consent
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Referral data sharing</h4>
        <p className="text-sm text-gray-600">
          Whether the student allows a referral session's report to be shared with the
          requesting College. This is the student's own choice and cannot be
          overridden here.
        </p>
        <div className="mt-2">
          {consent?.referralSharingConsent === "yes" ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">Allowed</span>
          ) : consent?.referralSharingConsent === "no" ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Not allowed</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Not yet decided</span>
          )}
          {consent?.referralSharingDecidedAt && (
            <span className="text-xs text-gray-500 ml-2">
              as of {formatDateTime(consent.referralSharingDecidedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileSignature size={18} className="text-maroon-600" /> Signed paper consent
        </h4>
        {consent?.scanUrl ? (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm">
            <FileUp size={16} className="text-blue-600" />
            <a href={scanHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1">
              {consent.scanFilename || "Consent scan"} <ExternalLink size={12} />
            </a>
            <span className="text-xs text-gray-500 ml-2">
              Uploaded {formatDateTime(consent.uploadedAt)}{consent.uploaderName ? ` by ${consent.uploaderName}` : ""}
            </span>
            {!readOnly && (
              <div className="ml-auto flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded border text-xs hover:bg-gray-50">
                  Replace
                  <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
                </label>
                <button onClick={() => setConfirmRemoveScan(true)} className="px-3 py-1.5 rounded border text-xs text-red-600 hover:bg-red-50">Remove</button>
              </div>
            )}
          </div>
        ) : !readOnly ? (
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:bg-gray-50">
            <FileUp size={14} /> Upload signed paper (PDF/JPG/PNG, max 5 MB)
            <input key={scanInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanChange} />
          </label>
        ) : (
          <p className="text-sm text-gray-500">No scan uploaded.</p>
        )}
      </div>

      {/* ── Revocation Request Review (counselor only) ── */}
      {!readOnly && consent?.eConsentSignedAt && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-600" /> Revocation requests
          </h4>
          {revRequestLoading ? (
            <p className="text-sm text-gray-500">Loading request status…</p>
          ) : (
            <div className="space-y-3">
              {REVOCATION_TYPES.map(({ type, label }) => {
                const req = revRequests[type];
                const isActive = decideType === type;
                const badgeClass =
                  req?.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : req?.status === "approved"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-600";
                return (
                  <div key={type} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {req?.status === "pending"
                          ? "Pending"
                          : req?.status === "approved"
                            ? "Approved"
                            : req?.status === "rejected"
                              ? "Rejected"
                              : "None"}
                      </span>
                    </div>

                    {req?.status === "pending" ? (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-gray-600">
                          Submitted by {req.studentName} on {formatDateTime(req.requestedAt)}.
                        </p>

                        {isActive && decideFeedback && (
                          <p className={`text-xs rounded px-2 py-1.5 border ${decideFeedback.type === "error" ? "text-red-700 bg-red-50 border-red-200" : "text-green-700 bg-green-50 border-green-200"}`}>
                            {decideFeedback.text}
                          </p>
                        )}

                        {!isActive ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setDecideType(type); setDecideAction("approve"); setDecideFeedback(null); }}
                              disabled={decideBusy}
                              className="px-4 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium disabled:opacity-50"
                            >
                              Approve revocation
                            </button>
                            <button
                              onClick={() => { setDecideType(type); setDecideAction("reject"); setDecideFeedback(null); setRejectionReason(""); }}
                              disabled={decideBusy}
                              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                            >
                              Reject request
                            </button>
                          </div>
                        ) : decideAction === "approve" ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">
                              Approving will revoke this student's {label.toLowerCase()}.{" "}
                              {type === "consent"
                                ? "The signature will be removed from the active form"
                                : "The authorization will be withdrawn from the active form"}{" "}
                              and the student will be notified.
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleDecide}
                                disabled={decideBusy}
                                autoFocus
                                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                              >
                                {decideBusy ? "Processing…" : "Confirm approval"}
                              </button>
                              <button
                                onClick={() => { setDecideType(null); setDecideAction(null); setDecideFeedback(null); }}
                                disabled={decideBusy}
                                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700">
                              Rejection reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                              maxLength={1000}
                              placeholder="Briefly explain why the request is being rejected…"
                              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-maroon-600 resize-none"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleDecide}
                                disabled={decideBusy || !rejectionReason.trim()}
                                className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-900 text-sm font-medium disabled:opacity-50"
                              >
                                {decideBusy ? "Processing…" : "Confirm rejection"}
                              </button>
                              <button
                                onClick={() => { setDecideType(null); setDecideAction(null); setRejectionReason(""); setDecideFeedback(null); }}
                                disabled={decideBusy}
                                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        {req?.status === "rejected"
                          ? `Rejected${req.rejectionReason ? `: ${req.rejectionReason}` : ""}.`
                          : req?.status === "approved"
                            ? "Approved — no longer active."
                            : "No revocation request from this student."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Revoke consent?"
        subtitle={student?.name ? `Consent record for ${student.name}` : undefined}
        danger
        footer={
          <>
            <button onClick={() => setConfirmRevoke(false)} className={BTN.secondary}>
              Cancel
            </button>
            <button onClick={handleRevoke} className={BTN.danger}>
              Revoke
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          This sets a revoked timestamp on the consent record. The student will need to e-sign
          again before further counseling.
        </p>
      </Modal>

      <Modal
        open={confirmRevokeAuth}
        onClose={() => setConfirmRevokeAuth(false)}
        title="Revoke data authorization?"
        subtitle={student?.name ? `Authorization record for ${student.name}` : undefined}
        danger
        footer={
          <>
            <button onClick={() => setConfirmRevokeAuth(false)} className={BTN.secondary}>
              Cancel
            </button>
            <button onClick={handleRevokeAuthorization} className={BTN.danger}>
              Revoke
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          This removes the student's data authorization under RA 10173. The student will need to
          re-check the disclaimer in their inventory form to re-authorize.
        </p>
      </Modal>

      <Modal
        open={confirmRemoveScan}
        onClose={() => setConfirmRemoveScan(false)}
        title="Remove signed paper scan?"
        subtitle="The e-sign record (if any) will not be affected."
        danger
        footer={
          <>
            <button onClick={() => setConfirmRemoveScan(false)} className={BTN.secondary}>
              Cancel
            </button>
            <button onClick={handleScanDelete} className={BTN.danger}>
              Remove
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-700 leading-relaxed">
          Only the uploaded scan file will be detached.
        </p>
      </Modal>
    </div>
  );
}

// A student's sessions form chains of follow-ups that end either in a
// termination or are still open. Once a chain ends in termination, every
// follow-up session that led up to it should read as "Terminated" too —
// there's no more pending session, so the case is closed. This is computed
// purely from chronological order (no DB link between sessions is needed):
// walk the sessions oldest-first, and whenever one is a termination, mark
// every session accumulated so far (the whole chain) as terminated.
function computeEffectiveNextSession(studentSessions) {
  const sorted = [...studentSessions].sort(
    (a, b) => new Date(a.sessionDate || 0) - new Date(b.sessionDate || 0)
  );
  const effective = new Map();
  let chain = [];
  for (const s of sorted) {
    chain.push(s);
    if (s.nextSession === "termination") {
      chain.forEach((cs) => effective.set(cs.id, "termination"));
      chain = [];
    }
  }
  // Any sessions left in an open chain (no termination yet) keep their own value.
  chain.forEach((cs) => effective.set(cs.id, cs.nextSession));
  return effective;
}

function SessionsList({ student, sessions, onEditSession, onDeleteSession, onSubmitSession }) {
  const { currentUser } = useAuth();
  const studentSessions = useMemo(
    () => sessions.filter((s) => s.studentId === student?.id),
    [sessions, student?.id]
  );
  const effectiveNextSession = useMemo(
    () => computeEffectiveNextSession(studentSessions),
    [studentSessions]
  );
  const [viewing, setViewing] = useState(null);
  const [openPopoverId, setOpenPopoverId] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const buttonRefs = useRef({});
  const popoverRef = useRef(null);

  const togglePopover = (e, id) => {
    if (openPopoverId === id) { setOpenPopoverId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenPopoverId(id);
  };

  useEffect(() => {
    if (!openPopoverId) return;
    const handler = (e) => {
      const btn = buttonRefs.current[openPopoverId];
      const pop = popoverRef.current;
      if ((!btn || !btn.contains(e.target)) && (!pop || !pop.contains(e.target))) {
        setOpenPopoverId(null);
      }
    };
    const onScroll = () => setOpenPopoverId(null);
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [openPopoverId]);

  if (!studentSessions.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6 text-center text-sm text-gray-500">
        No counseling sessions recorded for this student yet.
      </div>
    );
  }

  const titleFor = (s) =>
    `Session Report — ${s.studentName || student?.name} (${(s.sessionDate || "").split("T")[0]})`;

  const pageItems = studentSessions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const downloadSession = (s) =>
    saveReportAsPdfFile(s, { title: titleFor(s), signatureUrl: currentUser?.signatureUrl });

  return (
    <div className="space-y-3">
      {/* ── Desktop / tablet: table (scrolls instead of squeezing) ── */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[680px]">
          <colgroup>
            <col style={{ width: "14%" }} />
            <col style={{ width: "32%" }} />
            <col style={{ width: "32%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concern</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Summary</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((s) => {
              const effectiveNext = effectiveNextSession.get(s.id) ?? s.nextSession;
              return (
              <tr key={s.id} className="hover:bg-gray-50/70 align-top">
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                  {formatDate(s.sessionDate)}
                  <span className={`mt-1 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${s.finalizedAt ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                    {s.finalizedAt ? "Submitted" : "Draft"}
                  </span>
                </td>
                <td className="px-3 py-2.5 min-w-0">
                  <p className="line-clamp-3 text-sm text-gray-700 break-words">{s.presentingConcern || "—"}</p>
                </td>
                <td className="px-3 py-2.5 min-w-0">
                  <p className="line-clamp-3 text-sm text-gray-700 break-words">{s.summary || "—"}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex text-xs px-2 py-1 rounded-full whitespace-nowrap ${effectiveNext === "termination" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
                    {NEXT_LABELS[effectiveNext] || effectiveNext}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div ref={(el) => { buttonRefs.current[s.id] = el; }} className="inline-block">
                    <button
                      onClick={(e) => togglePopover(e, s.id)}
                      className="p-1.5 rounded hover:bg-gray-100 transition"
                      title="Actions"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {studentSessions.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-600">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, studentSessions.length)} of {studentSessions.length} sessions
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(studentSessions.length / PAGE_SIZE) - 1, p + 1))}
                disabled={(page + 1) * PAGE_SIZE >= studentSessions.length}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile: full-width cards (no squeezed table columns) ── */}
      <div className="md:hidden space-y-3">
        {pageItems.map((s) => {
          const effectiveNext = effectiveNextSession.get(s.id) ?? s.nextSession;
          const isOwner = currentUser?.role === "counselor" && Number(s.counselorId) === Number(currentUser.id);
          const canModify = isOwner && !s.finalizedAt;
          return (
            <article key={s.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(s.sessionDate)}</p>
                  <p className="text-xs text-gray-500">{s.counselorName ? `by ${s.counselorName}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.finalizedAt ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                    {s.finalizedAt ? "Submitted" : "Draft"}
                  </span>
                  <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${effectiveNext === "termination" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
                    {NEXT_LABELS[effectiveNext] || effectiveNext}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Concern</p>
                <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{s.presentingConcern || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Summary</p>
                <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{s.summary || "—"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button onClick={() => setViewing(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-50">
                  <Eye size={13} /> View
                </button>
                <button
                  onClick={() => currentUser?.signatureUrl && downloadSession(s)}
                  disabled={!currentUser?.signatureUrl}
                  title={currentUser?.signatureUrl ? "Download as PDF" : "Upload your signature in Profile to enable downloads"}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  <FileDown size={13} /> PDF
                </button>
                {canModify && (
                  <>
                    <button onClick={() => onEditSession?.(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-50">
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => onSubmitSession?.(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                      <CheckCircle2 size={13} /> Submit
                    </button>
                    <button onClick={() => onDeleteSession?.(s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {studentSessions.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-1 py-1 text-xs text-gray-600">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, studentSessions.length)} of {studentSessions.length} sessions
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border bg-white disabled:opacity-40"
                title="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(studentSessions.length / PAGE_SIZE) - 1, p + 1))}
                disabled={(page + 1) * PAGE_SIZE >= studentSessions.length}
                className="p-2 rounded-lg border bg-white disabled:opacity-40"
                title="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? titleFor(viewing) : "Session report"}
        subtitle={
          viewing?.finalizedAt
            ? `Finalized ${new Date(viewing.finalizedAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
            : "Draft session record"
        }
        size="lg"
        footer={
          viewing && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                disabled={!currentUser?.signatureUrl}
                title={currentUser?.signatureUrl ? undefined : "Upload your signature in Profile to enable downloads"}
                onClick={() => saveReportAsPdfFile(viewing, { title: titleFor(viewing), signatureUrl: currentUser?.signatureUrl })}
              >
                <FileDown size={14} /> Download PDF
              </button>
              <button className={BTN.primary} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {viewing && (
          <ReportPreview report={viewing} title={titleFor(viewing)} fallbackSignatureUrl={currentUser?.signatureUrl} />
        )}
      </Modal>

      {openPopoverId && popoverPos && (() => {
        const popSess = studentSessions.find((x) => x.id === openPopoverId);
        if (!popSess) return null;
        const isCounselorPop = currentUser?.role === "counselor" && Number(popSess.counselorId) === Number(currentUser.id);
        // Submitted Session Reports are immutable — drafts stay editable.
        const canModify = isCounselorPop && !popSess.finalizedAt;
        return createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed", top: popoverPos.top, right: popoverPos.right, zIndex: 9999 }}
            className="w-44 bg-white rounded-xl shadow-lg ring-1 ring-gray-950/10 py-1 overflow-hidden"
          >
            <button
              onClick={() => { setViewing(popSess); setOpenPopoverId(null); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Eye size={13} /> View
            </button>
            <button
              onClick={currentUser?.signatureUrl ? () => { saveReportAsPdfFile(popSess, { title: titleFor(popSess), signatureUrl: currentUser.signatureUrl }); setOpenPopoverId(null); } : undefined}
              disabled={!currentUser?.signatureUrl}
              title={currentUser?.signatureUrl ? "Download as PDF" : "Upload your signature in Profile to enable downloads"}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition text-left ${currentUser?.signatureUrl ? "text-gray-700 hover:bg-gray-50" : "text-gray-400 cursor-not-allowed"}`}
            >
              <FileDown size={13} /> Download
            </button>
            {canModify && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { onEditSession?.(popSess); setOpenPopoverId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition text-left"
                >
                  <Edit size={13} /> Edit
                </button>
                <button
                  onClick={() => { onSubmitSession?.(popSess); setOpenPopoverId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition text-left"
                >
                  <CheckCircle2 size={13} /> Submit
                </button>
                <button
                  onClick={() => { onDeleteSession?.(popSess); setOpenPopoverId(null); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition text-left"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
            {isCounselorPop && popSess.finalizedAt && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <p className="px-4 py-2.5 text-xs text-gray-400">Submitted — read-only</p>
              </>
            )}
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

// Released psychological test results for one student — the counselor-side
// mirror of the student's "My Records → Psychological Test Results" tab.
// Previously released results lived only in test_results / the student view,
// so counselors had no way to see them inside the per-student record drawer.
function TestsList({ student }) {
  const { testResults, fetchTestResults } = useTestResults?.() || {};
  const { currentUser, token } = useAuth();
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchTestResults?.().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const studentTests = useMemo(() => {
    const list = Array.isArray(testResults) ? testResults : [];
    return list
      .filter((r) => {
        const sid = r.student_id ?? r.studentId ?? r.studentUserId;
        return Number(sid) === Number(student?.id);
      })
      .sort((x, y) => new Date(y.completedDate || y.completed_date || 0) - new Date(x.completedDate || x.completed_date || 0));
  }, [testResults, student?.id]);

  if (!studentTests.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6 text-center text-sm text-gray-500">
        No psychological test results released for this student yet.
      </div>
    );
  }

  const fileHref = (r) => {
    const url = r.resultFileUrl || r.result_file_url;
    if (!url) return null;
    return url.startsWith("http") ? url : `${apiBase}${url}`;
  };

  const handleSave = async (r) => {
    setSavingId(r.id);
    try {
      await saveTestResultAsPdfFile(r, {
        studentName: student?.name,
        signatureUrl: currentUser?.signatureUrl,
        token,
      });
    } catch {
      alert("Failed to save the test result as PDF. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {studentTests.map((r) => {
        const testName = r.testName || r.test_name || "Psychological test";
        const completed = r.completedDate || r.completed_date;
        const href = fileHref(r);
        return (
          <article key={r.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 break-words">{testName}</p>
                <p className="text-xs text-gray-500 tabular-nums mt-0.5">
                  Completed {completed ? formatDate(completed) : "—"}
                  {r.counselorName ? ` · by ${r.counselorName}` : ""}
                </p>
              </div>
              <span className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 size={12} /> Released
              </span>
            </div>
            {(r.summary || r.recommendations) && (
              <div className="grid grid-cols-1 gap-3">
                {r.summary && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Summary</p>
                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{r.summary}</p>
                  </div>
                )}
                {r.recommendations && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Recommendations</p>
                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{r.recommendations}</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink size={13} /> View file{r.resultFileName || r.result_file_name ? ` (${r.resultFileName || r.result_file_name})` : ""}
                </a>
              )}
              <button
                onClick={() => handleSave(r)}
                disabled={savingId === r.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-maroon-600 text-white text-xs font-medium hover:bg-maroon-700 disabled:opacity-50"
              >
                <FileDown size={13} /> {savingId === r.id ? "Saving…" : "Save PDF"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function StudentRecordsDrawer({ student, onClose, onRecordsChanged, onEditSession, onDeleteSession, onSubmitSession, readOnly = false, initialTab = "inventory" }) {
  const {
    getRecords,
    upsertInventory, uploadInventoryScan, deleteInventoryScan,
    uploadConsentScan, deleteConsentScan, revokeConsent, revokeAuthorization,
    decideRevocationRequest,
  } = useStudentRecords();
  const { sessions } = useCounselingSessions();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState(initialTab || "inventory");
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [consent, setConsent] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!student?.id) return;
    setLoading(true);
    getRecords(student.id)
      .then(({ inventory: inv, consent: c }) => {
        setInventory(inv);
        setConsent(c);
      })
      .catch((err) => console.error("Failed to load records:", err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const refresh = async () => {
    if (!student?.id) return;
    const { inventory: inv, consent: c } = await getRecords(student.id);
    setInventory(inv);
    setConsent(c);
    onRecordsChanged?.(student.id, { inventory: inv, consent: c });
  };

  const handleSaveInventory = async (formData) => {
    const res = await upsertInventory(student.id, formData);
    if (res.success) {
      setInventory(res.inventory);
      onRecordsChanged?.(student.id, { inventory: res.inventory, consent });
    }
    return res;
  };

  const handleUploadInventoryScan = async (file) => {
    const res = await uploadInventoryScan(student.id, file);
    if (res.success) {
      setInventory(res.inventory);
      onRecordsChanged?.(student.id, { inventory: res.inventory, consent });
    }
    return res;
  };

  const handleDeleteInventoryScan = async () => {
    const res = await deleteInventoryScan(student.id);
    if (res.success) await refresh();
    return res;
  };

  const handleUploadConsentScan = async (file) => {
    const res = await uploadConsentScan(student.id, file);
    if (res.success) {
      setConsent(res.consent);
      onRecordsChanged?.(student.id, { inventory, consent: res.consent });
    }
    return res;
  };

  const handleDeleteConsentScan = async () => {
    const res = await deleteConsentScan(student.id);
    if (res.success) await refresh();
    return res;
  };

  const handleRevokeConsent = async () => {
    const res = await revokeConsent(student.id);
    if (res.success) await refresh();
    return res;
  };

  const handleRevokeAuthorization = async () => {
    const res = await revokeAuthorization(student.id);
    if (res.success) await refresh();
    return res;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 hidden sm:block" onClick={onClose} />
      <aside className="w-full sm:max-w-2xl lg:max-w-5xl bg-gray-50 shadow-xl h-full flex flex-col ml-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{student?.name || "Student"}</h3>
            <p className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {student?.studentId && <span>ID: {student.studentId}</span>}
              {student?.studentId && (student?.email || student?.phone || student?.college) && <span className="text-gray-300">•</span>}
              {student?.email && <span className="break-all">Email: {student.email}</span>}
              {student?.phone && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>Contact: {student.phone}</span>
                </>
              )}
              {student?.college && (
                <>
                  <span className="text-gray-300">•</span>
                  <span>College: {student.college}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setChatOpen(true)}
              disabled={!student?.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium disabled:opacity-50"
            >
              <MessageCircle size={14} /> Message
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X size={20} /></button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto">
          <button onClick={() => setTab("inventory")} className={`px-3 sm:px-4 py-3 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${tab === "inventory" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <ClipboardList size={16} /> Inventory
          </button>
          <button onClick={() => setTab("consent")} className={`px-3 sm:px-4 py-3 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${tab === "consent" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <FileSignature size={16} /> Consent
          </button>
          <button onClick={() => setTab("sessions")} className={`px-3 sm:px-4 py-3 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${tab === "sessions" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <BookOpen size={16} /> Sessions
          </button>
          <button onClick={() => setTab("tests")} className={`px-3 sm:px-4 py-3 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${tab === "tests" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <FlaskConical size={16} /> Tests
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading records...</div>
          ) : tab === "inventory" ? (
            <InventoryForm
              inventory={inventory}
              studentName={student?.name}
              studentId={student?.id}
              studentProfile={student}
              apiBase={apiBase}
              consent={consent}
              onSave={handleSaveInventory}
              onUploadScan={handleUploadInventoryScan}
              onDeleteScan={handleDeleteInventoryScan}
              readOnly={readOnly || currentUser?.role === "counselor"}
              canManage={currentUser?.role === "counselor"}
            />
          ) : tab === "consent" ? (
            <ConsentPanel
              student={student}
              consent={consent}
              inventory={inventory}
              onUploadScan={handleUploadConsentScan}
              onDeleteScan={handleDeleteConsentScan}
              onRevoke={handleRevokeConsent}
              onRevokeAuthorization={handleRevokeAuthorization}
              onRevocationDecided={refresh}
              readOnly={readOnly}
            />
          ) : tab === "sessions" ? (
            <SessionsList
              student={student}
              sessions={sessions}
              onEditSession={onEditSession}
              onDeleteSession={onDeleteSession}
              onSubmitSession={onSubmitSession}
            />
          ) : (
            <TestsList student={student} />
          )}
        </div>
      </aside>

      {chatOpen && student?.id && (
        <ChatModal recipientUser={student} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
