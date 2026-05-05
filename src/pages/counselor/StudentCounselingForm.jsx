import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppointments } from "../../context/AppointmentsContext";

export default function StudentCounselingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appointments, saveSessionForm } = useAppointments();

  const apptId = Number(id);
  const appt = useMemo(() => appointments.find(a => a.id === apptId), [appointments, apptId]);

  const [form, setForm] = useState(() => ({
    studentName: appt?.studentName || "",
    date: new Date().toISOString().split('T')[0],
    counselorName: "",
    reason: {
      routine: false,
      routineNth: "",
      studentInitiated: false,
      instituteInitiated: false,
      description: "",
    },
    goals: "",
    summary: "",
    plan: "",
    comments: "",
    nextSession: "followup", // 'followup' | 'termination'
    counselorSignature: "",
  }));

  if (!appt) {
    return (
      <div className="p-6">
        <p className="text-gray-700">Appointment not found.</p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSessionForm(appt.id, form);
    alert("Counseling form saved.");
    navigate(-1);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">STUDENT COUNSELING FORM</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student's Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Counselor's Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.counselorName} onChange={(e) => setForm({ ...form, counselorName: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Reason for Counseling</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.reason.routine} onChange={(e) => setForm({ ...form, reason: { ...form.reason, routine: e.target.checked } })} />
              <span>Routine</span>
              <span className="text-sm text-gray-500">(nth)</span>
              <input className="border rounded px-2 py-1 w-24" placeholder="e.g., 1st" value={form.reason.routineNth} onChange={(e) => setForm({ ...form, reason: { ...form.reason, routineNth: e.target.value } })} />
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.reason.studentInitiated} onChange={(e) => setForm({ ...form, reason: { ...form.reason, studentInitiated: e.target.checked } })} />
              <span>Student Initiated</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.reason.instituteInitiated} onChange={(e) => setForm({ ...form, reason: { ...form.reason, instituteInitiated: e.target.checked } })} />
              <span>Institute Initiated</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identify reason</label>
              <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.reason.description} onChange={(e) => setForm({ ...form, reason: { ...form.reason, description: e.target.value } })} />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Goals</h3>
          <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
        </div>

        {/* Section 3 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Summary of Counseling / Key Points of Discussion</h3>
          <textarea rows={5} className="w-full border rounded px-3 py-2" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>

        {/* Section 4 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Plan of Action</h3>
          <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
        </div>

        {/* Section 5 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Counselor's Comments</h3>
          <textarea rows={3} className="w-full border rounded px-3 py-2" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
        </div>

        {/* Section 6 */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Next Counseling Session</h3>
          <label className="flex items-center gap-2 mb-2">
            <input type="radio" name="nextSession" checked={form.nextSession === 'followup'} onChange={() => setForm({ ...form, nextSession: 'followup' })} />
            Follow-up
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="nextSession" checked={form.nextSession === 'termination'} onChange={() => setForm({ ...form, nextSession: 'termination' })} />
            Termination
          </label>
        </div>

        {/* Footer */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Counselor Signature</h3>
          <input className="w-full border rounded px-3 py-2" placeholder="Type counselor name as signature" value={form.counselorSignature} onChange={(e) => setForm({ ...form, counselorSignature: e.target.value })} />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="px-4 py-2 bg-maroon-600 text-white rounded">Save</button>
          <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-gray-600 text-white rounded">Print</button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded">Back</button>
        </div>

        <style>{`
          @media print {
            button { display: none !important; }
          }
        `}</style>
      </form>
    </div>
  );
}
