// src/components/records/StudentRecordsDrawer.jsx
// Right-side drawer that opens when a counselor clicks a student in the
// "Students" tab. Three sub-tabs:
//   - Inventory: digital MSU form + scan upload
//   - Consent:   e-sign status, signed-paper scan, revoke
//   - Sessions:  counseling sessions filtered to this student
import React, { useEffect, useMemo, useState } from "react";
import { X, ClipboardList, FileSignature, BookOpen, ExternalLink, FileUp, ShieldOff, CheckCircle2, AlertTriangle, MessageCircle, Eye, Download, FileDown } from "lucide-react";
import { useStudentRecords } from "../../context/StudentRecordsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import InventoryForm from "./InventoryForm";
import ChatModal from "../ChatModal";
import { Modal, BTN } from "../ui";
import { downloadReportAsDocx, downloadReportAsPdf } from "../../utils/sessionReport";

const NEXT_LABELS = { followup: "Follow-up", termination: "Termination" };
const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function formatDateTime(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function ConsentStatusBadge({ consent }) {
  if (!consent) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting consent</span>;
  if (consent.revokedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Revoked</span>;
  if (consent.eConsentSignedAt) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">E-signed</span>;
  if (consent.scanUrl) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Paper on file</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Awaiting consent</span>;
}

function ConsentPanel({ student, consent, onConsentChanged, onUploadScan, onDeleteScan, onRevoke, readOnly }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmRemoveScan, setConfirmRemoveScan] = useState(false);
  const [scanInputKey, setScanInputKey] = useState(0);

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

      <div className="bg-white border border-gray-200 rounded-lg p-4">
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

      <div className="bg-white border border-gray-200 rounded-lg p-4">
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

      {!readOnly && consent?.eConsentSignedAt && !consent.revokedAt && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <ShieldOff size={18} className="text-red-600" /> Revoke consent
          </h4>
          <p className="text-sm text-gray-600 mb-3">Use this only if the student has formally withdrawn consent. They can re-sign anytime.</p>
          <button disabled={busy} onClick={() => setConfirmRevoke(true)} className="px-4 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50">
            Revoke consent
          </button>
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

function SessionsList({ student, sessions }) {
  const studentSessions = useMemo(
    () => sessions.filter((s) => s.studentId === student?.id),
    [sessions, student?.id]
  );
  const [viewing, setViewing] = useState(null);

  if (!studentSessions.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
        No counseling sessions recorded for this student yet.
      </div>
    );
  }

  const titleFor = (s) =>
    `Session Report — ${s.studentName || student?.name} (${(s.sessionDate || "").split("T")[0]})`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Concern</th>
            <th className="px-3 py-2 text-left">Summary</th>
            <th className="px-3 py-2 text-left">Next</th>
            <th className="px-3 py-2 text-right">Report</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {studentSessions.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50/70">
              <td className="px-3 py-2 whitespace-nowrap text-gray-700">{(s.sessionDate || "").split("T")[0]}</td>
              <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={s.presentingConcern}>{s.presentingConcern || "—"}</td>
              <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={s.summary}>{s.summary || "—"}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-1 rounded-full ${s.nextSession === "termination" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-700"}`}>
                  {NEXT_LABELS[s.nextSession] || s.nextSession}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    onClick={() => setViewing(s)}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="View report"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => downloadReportAsDocx(s, { title: titleFor(s) })}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Download as Word (DOCX)"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => downloadReportAsPdf(s, { title: titleFor(s) })}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="Download / print as PDF"
                  >
                    <FileDown size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? titleFor(viewing) : "Session report"}
        subtitle={
          viewing?.finalizedAt
            ? `Finalized ${new Date(viewing.finalizedAt).toLocaleString()}`
            : "Draft session record"
        }
        size="lg"
        footer={
          viewing && (
            <div className="flex items-center gap-2">
              <button
                className={BTN.secondary}
                onClick={() => downloadReportAsDocx(viewing, { title: titleFor(viewing) })}
              >
                <Download size={14} /> DOCX
              </button>
              <button
                className={BTN.secondary}
                onClick={() => downloadReportAsPdf(viewing, { title: titleFor(viewing) })}
              >
                <FileDown size={14} /> PDF
              </button>
              <button className={BTN.primary} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          )
        }
      >
        {viewing && (
          <dl className="divide-y divide-gray-100 text-sm">
            <SessionViewRow label="Student" value={viewing.studentName || student?.name} />
            <SessionViewRow label="College" value={viewing.studentCollege || student?.college} />
            <SessionViewRow label="Session date" value={(viewing.sessionDate || "").split("T")[0]} />
            <SessionViewRow label="Counselor" value={viewing.counselorName} />
            <SessionViewRow label="Presenting concern" value={viewing.presentingConcern} />
            <SessionViewRow label="Goals" value={viewing.goals} />
            <SessionViewRow label="Summary" value={viewing.summary} />
            <SessionViewRow label="Plan" value={viewing.plan} />
            <SessionViewRow label="Comments" value={viewing.comments} />
            <SessionViewRow label="Next session" value={NEXT_LABELS[viewing.nextSession] || viewing.nextSession} />
            <SessionViewRow label="Signed by" value={viewing.counselorSignature} />
          </dl>
        )}
      </Modal>
    </div>
  );
}

function SessionViewRow({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 whitespace-pre-wrap">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

export default function StudentRecordsDrawer({ student, onClose, onRecordsChanged, readOnly = false }) {
  const {
    getRecords,
    upsertInventory, uploadInventoryScan, deleteInventoryScan,
    uploadConsentScan, deleteConsentScan, revokeConsent,
  } = useStudentRecords();
  const { sessions } = useCounselingSessions();

  const [tab, setTab] = useState("inventory");
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [consent, setConsent] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-5xl bg-gray-50 shadow-xl h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{student?.name || "Student"}</h3>
            <p className="text-xs text-gray-600">
              {student?.studentId || student?.email || ""}{student?.college ? ` • ${student.college}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChatOpen(true)}
              disabled={!student?.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition font-medium disabled:opacity-50"
            >
              <MessageCircle size={14} /> Send Message
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X size={20} /></button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-2">
          <button onClick={() => setTab("inventory")} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${tab === "inventory" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <ClipboardList size={16} /> Inventory
          </button>
          <button onClick={() => setTab("consent")} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${tab === "consent" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <FileSignature size={16} /> Consent
          </button>
          <button onClick={() => setTab("sessions")} className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${tab === "sessions" ? "text-maroon-600 border-b-2 border-maroon-600" : "text-gray-600 hover:text-gray-900"}`}>
            <BookOpen size={16} /> Sessions
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading records...</div>
          ) : tab === "inventory" ? (
            <InventoryForm
              inventory={inventory}
              studentName={student?.name}
              studentId={student?.id}
              apiBase={apiBase}
              onSave={handleSaveInventory}
              onUploadScan={handleUploadInventoryScan}
              onDeleteScan={handleDeleteInventoryScan}
              readOnly={readOnly}
            />
          ) : tab === "consent" ? (
            <ConsentPanel
              student={student}
              consent={consent}
              onUploadScan={handleUploadConsentScan}
              onDeleteScan={handleDeleteConsentScan}
              onRevoke={handleRevokeConsent}
              readOnly={readOnly}
            />
          ) : (
            <SessionsList student={student} sessions={sessions} />
          )}
        </div>
      </aside>

      {chatOpen && student?.id && (
        <ChatModal recipientUser={student} onClose={() => setChatOpen(false)} />
      )}
    </div>
  );
}
