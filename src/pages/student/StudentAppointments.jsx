import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { useReactToPrint } from "react-to-print";
import { Calendar, Clock, FileText, Printer, X } from "lucide-react";

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rescheduled", label: "Rescheduled" },
  { id: "rejected", label: "Rejected" },
];

const statusPill = (status) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rescheduled":
      return "bg-blue-100 text-blue-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "completed":
      return "bg-gray-200 text-gray-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

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
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchAppointments?.().catch(() => undefined);
  }, [fetchAppointments]);

  const mine = useMemo(
    () => (appointments || []).filter((a) => a.student_id === currentUser?.id || a.studentId === currentUser?.id),
    [appointments, currentUser?.id]
  );

  const visible = useMemo(() => {
    if (activeTab === "all") return mine;
    return mine.filter((a) => a.status === activeTab);
  }, [mine, activeTab]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="text-maroon-600" size={24} /> My Appointments
        </h2>
        <p className="text-sm text-gray-600">Every appointment you've requested, with current status.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => {
          const count = t.id === "all" ? mine.length : mine.filter((a) => a.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 font-medium transition whitespace-nowrap ${
                activeTab === t.id
                  ? "text-maroon-600 border-b-2 border-maroon-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label} <span className="text-xs text-gray-500">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-700">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Counselor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No appointments in this view.
                </td>
              </tr>
            ) : (
              visible.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{formatDate(a.scheduledDate || a.preferredDate)}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} /> {a.scheduledTimeSlot || (Array.isArray(a.preferredSlots) ? a.preferredSlots[0] : a.timeSlot) || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {(a.appointment_type || "counseling").replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.counselorName || "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusPill(a.status)}`}
                      title={a.counselor_action_note || ""}
                    >
                      {a.status || "pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(a)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs hover:bg-gray-50"
                    >
                      <FileText size={14} /> View / Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `appointment-${appointment.id}`,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mt-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Appointment Details</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-maroon-600 text-white text-sm hover:bg-maroon-700"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>
        <div ref={printRef} className="p-6 space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold">CounselLink MSU-Marawi</h2>
            <p className="text-xs text-gray-600">Division of Student Affairs · Appointment Slip</p>
          </div>
          <dl className="divide-y divide-gray-100">
            <DetailRow label="Student" value={studentName || "—"} />
            <DetailRow label="Type" value={(appointment.appointment_type || "counseling").replace("_", " ")} />
            <DetailRow label="Status" value={appointment.status} />
            <DetailRow label="Preferred Date" value={formatDate(appointment.preferredDate)} />
            <DetailRow
              label="Preferred Slots"
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
            <DetailRow label="Counselor" value={appointment.counselorName || "Unassigned"} />
            {appointment.reason && <DetailRow label="Reason" value={appointment.reason} />}
            {appointment.counselor_action_note && (
              <DetailRow label="Counselor Note" value={appointment.counselor_action_note} />
            )}
            <DetailRow
              label="Submitted"
              value={appointment.created_at ? new Date(appointment.created_at).toLocaleString() : "—"}
            />
          </dl>
          <div className="pt-6 mt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="border-b border-gray-400 h-12"></div>
              <p className="text-xs text-gray-600 mt-1">Student Signature</p>
            </div>
            <div>
              <div className="border-b border-gray-400 h-12"></div>
              <p className="text-xs text-gray-600 mt-1">Counselor Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 capitalize">{value}</dd>
    </div>
  );
}
