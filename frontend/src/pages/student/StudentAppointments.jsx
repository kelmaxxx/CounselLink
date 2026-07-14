import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { Calendar, Clock, FileText, Download } from "lucide-react";
import { saveAppointmentSlipAsPdfFile } from "../../utils/appointmentSlip";
import { resolveSignatureDataUrl } from "../../utils/sessionReport";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  StatusPill,
  Modal,
  BTN,
  Pagination,
} from "../../components/ui";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rescheduled", label: "Rescheduled" },
  { id: "rejected", label: "Rejected" },
];

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

export default function StudentAppointments() {
  const { currentUser } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const { tests, fetchTests } = useTests();
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const APPTS_PER_PAGE = 10;

  useEffect(() => {
    fetchAppointments?.().catch(() => undefined);
    fetchTests?.().catch(() => undefined);
  }, [fetchAppointments, fetchTests]);

  const mine = useMemo(() => {
    const myAppts = (appointments || [])
      .filter((a) => a.student_id === currentUser?.id || a.studentId === currentUser?.id)
      .map((a) => ({ ...a, isTest: false }));

    const myTestsList = (tests || [])
      .filter((t) => t.student_id === currentUser?.id || t.studentUserId === currentUser?.id)
      .map((t) => ({ ...t, isTest: true }));

    return [...myAppts, ...myTestsList]
      .filter((item) => item.status !== "completed")
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
  }, [appointments, tests, currentUser?.id]);

  const visible = useMemo(() => {
    if (activeTab === "all") return mine;
    if (activeTab === "approved") {
      return mine.filter((a) => a.status === "approved" || a.status === "accepted");
    }
    return mine.filter((a) => a.status === activeTab);
  }, [mine, activeTab]);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="My appointments"
        subtitle="Your requested appointment and thier current status."
      />

      <div className="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => {
          const count =
            t.id === "all"
              ? mine.length
              : t.id === "approved"
                ? mine.filter((a) => a.status === "approved" || a.status === "accepted").length
                : mine.filter((a) => a.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setPage(1); }}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${activeTab === t.id
                ? "text-maroon-700 border-maroon-600"
                : "text-gray-500 border-transparent hover:text-gray-900"
                }`}
            >
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums ${activeTab === t.id
                  ? "bg-maroon-100 text-maroon-700"
                  : "bg-gray-100 text-gray-600"
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <SectionCard noBodyPadding>
        {visible.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments in this view"
            hint="Try a different tab or request a new appointment."
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Counselor</th>
                  <th className="px-4 py-2.5">Queue</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.slice((page - 1) * APPTS_PER_PAGE, page * APPTS_PER_PAGE).map((a) => (
                  <tr key={a.isTest ? `test-${a.id}` : `apt-${a.id}`} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 tabular-nums">
                        {formatDate(a.scheduledDate || a.preferredDate)}
                      </div>
                      <div className="text-xs text-gray-500 inline-flex items-center gap-1 tabular-nums">
                        <Clock size={11} />
                        {a.scheduledTimeSlot ||
                          (Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : a.timeSlot) ||
                          "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {a.isTest ? "Psychological" : "counseling"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.counselorName || "TBD"}</td>
                    <td className="px-4 py-3">
                      {(a.queueNumber || a.queue_number) ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${a.isTest ? "bg-blue-100 text-blue-700" : "bg-sky-100 text-sky-700"}`}>
                          {(a.queueSlot || a.queue_slot) || ""} #{a.queueNumber || a.queue_number}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(a)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100 transition"
                      >
                        <FileText size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={Math.ceil(visible.length / APPTS_PER_PAGE)}
            onPageChange={setPage}
          />
          </>
        )}
      </SectionCard>

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          studentName={currentUser?.name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function AppointmentDetailModal({ appointment, studentName, onClose }) {
  const [saving, setSaving] = useState(false);
  const [counselorSigDataUrl, setCounselorSigDataUrl] = useState(null);

  const canSave = ["approved", "accepted", "rescheduled"].includes(appointment.status);

  useEffect(() => {
    const url = appointment.counselorSignatureUrl || appointment.counselor_signature_url;
    if (!url) return;
    resolveSignatureDataUrl(url).then((d) => setCounselorSigDataUrl(d));
  }, [appointment.counselorSignatureUrl, appointment.counselor_signature_url]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAppointmentSlipAsPdfFile(appointment, { studentName });
    } catch {
      alert("Failed to save the appointment slip as PDF. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const preferredSlots = Array.isArray(appointment.preferredSlots)
    ? appointment.preferredSlots.join(", ")
    : appointment.timeSlot || "—";

  return (
    <Modal
      open
      onClose={onClose}
      title="Appointment details"
      size="lg"
      align="top"
      footer={
        <>
          <button onClick={onClose} className={BTN.secondary}>Close</button>
          {canSave && (
            <button onClick={handleSave} disabled={saving} className={BTN.primary}>
              <Download size={14} /> {saving ? "Saving…" : "Save PDF"}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CounselLink · MSU Marawi</p>
            <p className="text-xs text-gray-400">Division of Student Affairs</p>
          </div>
          <StatusPill status={appointment.status} />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoItem label="Student" value={studentName || "—"} />
          <InfoItem label="Type" value={appointment.isTest ? `Psychological (${appointment.testType})` : "Counseling"} />
          <InfoItem label="Preferred date" value={formatDate(appointment.preferredDate)} />
          <InfoItem label="Preferred slots" value={preferredSlots} />
          {appointment.scheduledDate && (
            <InfoItem
              label="Scheduled"
              value={`${formatDate(appointment.scheduledDate)}${appointment.scheduledTimeSlot ? ` · ${appointment.scheduledTimeSlot}` : ""}`}
            />
          )}
          {!appointment.isTest && (appointment.queueNumber || appointment.queue_number) && (
            <InfoItem
              label="Queue"
              value={`${appointment.queueSlot || appointment.queue_slot || ""} #${appointment.queueNumber || appointment.queue_number}`}
            />
          )}
          <InfoItem label="Counselor" value={appointment.counselorName || "TBD"} />
          <InfoItem
            label="Submitted"
            value={appointment.created_at ? new Date(appointment.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
          />
          {appointment.reason && <InfoItem label="Reason" value={appointment.reason} className="col-span-2" />}
          {appointment.counselor_action_note && (
            <InfoItem label="Counselor note" value={appointment.counselor_action_note} className="col-span-2" />
          )}
        </div>

        {/* Counselor signature */}
        <div className="pt-3 border-t border-gray-100">
          <div className="inline-block text-right min-w-[200px]">
            {counselorSigDataUrl ? (
              <img src={counselorSigDataUrl} alt="Counselor signature" className="h-10 ml-auto mb-1 object-contain" />
            ) : (
              <div className="h-10" />
            )}
            <div className="border-t border-gray-400 pt-1">
              <p className="text-xs font-medium text-gray-700">{appointment.counselorName || "—"}</p>
              <p className="text-[10px] text-gray-400">Counselor</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoItem({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}
