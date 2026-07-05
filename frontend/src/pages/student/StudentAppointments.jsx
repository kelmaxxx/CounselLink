import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useTests } from "../../context/TestsContext";
import { Calendar, Clock, FileText, Download } from "lucide-react";
import { saveAppointmentSlipAsPdfFile } from "../../utils/appointmentSlip";
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
  // Saving (a real .pdf, evidence of the appointment) only makes sense once
  // the counselor has acted on the request — while it's still pending there
  // is nothing confirmed yet to save, so the student can only view it.
  const canSave = ["approved", "accepted", "rescheduled"].includes(appointment.status);

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

  return (
    <Modal
      open
      onClose={onClose}
      title="Appointment details"
      subtitle={canSave ? "You may save this slip as a PDF for your records." : "View-only — you can save a PDF once this request is approved or rescheduled."}
      size="2xl"
      align="top"
      footer={
        <>
          <button onClick={onClose} className={BTN.secondary}>
            Close
          </button>
          {canSave && (
            <button onClick={handleSave} disabled={saving} className={BTN.primary}>
              <Download size={14} /> {saving ? "Saving…" : "Save"}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-center pb-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">CounselLink · MSU Marawi</h2>
          <p className="text-xs text-gray-600">
            Division of Student Affairs · Appointment Slip
          </p>
        </div>
        <dl className="divide-y divide-gray-100 text-sm">
          <DetailRow label="Student" value={studentName || "—"} />
          <DetailRow
            label="Type"
            value={appointment.isTest ? `Psychological (${appointment.testType})` : "counseling"}
          />
          <DetailRow label="Status" value={appointment.status} />
          <DetailRow label="Preferred date" value={formatDate(appointment.preferredDate)} />
          <DetailRow
            label="Preferred slots"
            value={
              Array.isArray(appointment.preferredSlots)
                ? appointment.preferredSlots.join(", ")
                : appointment.timeSlot || "—"
            }
          />
          {appointment.scheduledDate && (
            <DetailRow
              label="Scheduled"
              value={`${formatDate(appointment.scheduledDate)} ${appointment.scheduledTimeSlot || ""}`}
            />
          )}
          {!appointment.isTest && (appointment.queueNumber || appointment.queue_number) && (
            <DetailRow
              label="Queue no."
              value={`${appointment.queueSlot || appointment.queue_slot || ""} #${appointment.queueNumber || appointment.queue_number}`}
            />
          )}
          <DetailRow label="Counselor" value={appointment.counselorName || "TBD"} />
          {appointment.reason && <DetailRow label="Reason" value={appointment.reason} />}
          {appointment.counselor_action_note && (
            <DetailRow label="Counselor note" value={appointment.counselor_action_note} />
          )}
          <DetailRow
            label="Submitted"
            value={
              appointment.created_at ? new Date(appointment.created_at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
            }
          />
        </dl>
        <div className="pt-6 mt-2 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="border-b border-gray-400 h-12" />
            <p className="text-xs text-gray-600 mt-1">Student signature</p>
          </div>
          <div>
            <div className="border-b border-gray-400 h-12" />
            <p className="text-xs text-gray-600 mt-1">Counselor signature</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-4 gap-2">
      <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500">{label}</dt>
      <dd className="sm:col-span-3 text-sm text-gray-900 capitalize">{value}</dd>
    </div>
  );
}
