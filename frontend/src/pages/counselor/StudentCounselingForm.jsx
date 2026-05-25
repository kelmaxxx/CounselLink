import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppointments } from "../../context/AppointmentsContext";
import { useCounselingSessions } from "../../context/CounselingSessionsContext";
import { useAuth } from "../../context/AuthContext";

const blankReason = () => ({
  routine: false,
  routineNth: "",
  studentInitiated: false,
  instituteInitiated: false,
});

export default function StudentCounselingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { appointments } = useAppointments();
  const { fetchSessionByAppointment, createSession, updateSession } = useCounselingSessions();

  const apptId = Number(id);
  const appt = useMemo(() => appointments.find(a => a.id === apptId), [appointments, apptId]);

  const [existingSessionId, setExistingSessionId] = useState(null);
  const [reason, setReason] = useState(blankReason());
  const [form, setForm] = useState(() => ({
    studentName: "",
    sessionDate: new Date().toISOString().split("T")[0],
    counselorName: currentUser?.name || "",
    presentingConcern: "",
    goals: "",
    summary: "",
    plan: "",
    comments: "",
    nextSession: "followup",
    counselorSignature: currentUser?.name || "",
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!appt) return;
    setForm((f) => ({ ...f, studentName: appt.studentName || "" }));

    fetchSessionByAppointment(apptId)
      .then((session) => {
        if (session) {
          setExistingSessionId(session.id);
          setForm({
            studentName: session.studentName || appt.studentName || "",
            sessionDate: session.sessionDate ? session.sessionDate.split("T")[0] : new Date().toISOString().split("T")[0],
            counselorName: session.counselorName || currentUser?.name || "",
            presentingConcern: session.presentingConcern || "",
            goals: session.goals || "",
            summary: session.summary || "",
            plan: session.plan || "",
            comments: session.comments || "",
            nextSession: session.nextSession || "followup",
            counselorSignature: session.counselorSignature || currentUser?.name || "",
          });
          if (session.formData?.reason) setReason({ ...blankReason(), ...session.formData.reason });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId, appt?.id]);

  if (!appt) {
    return (
      <div className="p-6">
        <p className="text-gray-700">Appointment not found.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      studentId: appt.student_id || appt.studentId,
      appointmentId: apptId,
      sessionDate: form.sessionDate,
      presentingConcern: form.presentingConcern,
      goals: form.goals,
      summary: form.summary,
      plan: form.plan,
      comments: form.comments,
      nextSession: form.nextSession,
      counselorSignature: form.counselorSignature,
      formData: { reason, counselorName: form.counselorName },
    };

    const res = existingSessionId
      ? await updateSession(existingSessionId, payload)
      : await createSession(payload);

    setSaving(false);
    if (res.success) {
      if (!existingSessionId && res.session?.id) setExistingSessionId(res.session.id);
      setFeedback({ type: "success", text: "Counseling form saved." });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to save form" });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">STUDENT COUNSELING FORM</h2>
      {existingSessionId && (
        <p className="text-xs text-gray-500 mb-4">
          Editing existing session record (ID #{existingSessionId}). Changes will overwrite the saved record.
        </p>
      )}
      {!existingSessionId && !loading && (
        <p className="text-xs text-gray-500 mb-4">
          New session — saving will create a record under "Manage Students".
        </p>
      )}
      {loading && <p className="text-xs text-gray-500 mb-4">Loading existing record...</p>}

      {feedback && (
        <div className={`mb-4 p-3 rounded-lg border ${feedback.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student's Name</label>
              <input className="w-full border rounded px-3 py-2 bg-gray-50" value={form.studentName} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Counselor's Name</label>
              <input className="w-full border rounded px-3 py-2" value={form.counselorName} onChange={(e) => setForm({ ...form, counselorName: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Reason for Counseling</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={reason.routine} onChange={(e) => setReason({ ...reason, routine: e.target.checked })} />
              <span>Routine</span>
              <span className="text-sm text-gray-500">(nth)</span>
              <input className="border rounded px-2 py-1 w-24" placeholder="e.g., 1st" value={reason.routineNth} onChange={(e) => setReason({ ...reason, routineNth: e.target.value })} />
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={reason.studentInitiated} onChange={(e) => setReason({ ...reason, studentInitiated: e.target.checked })} />
              <span>Student Initiated</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={reason.instituteInitiated} onChange={(e) => setReason({ ...reason, instituteInitiated: e.target.checked })} />
              <span>Institute Initiated</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identify reason / presenting concern</label>
              <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.presentingConcern} onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Goals</h3>
          <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Summary of Counseling / Key Points of Discussion</h3>
          <textarea rows={5} className="w-full border rounded px-3 py-2" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Plan of Action</h3>
          <textarea rows={4} className="w-full border rounded px-3 py-2" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Counselor's Comments</h3>
          <textarea rows={3} className="w-full border rounded px-3 py-2" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Next Counseling Session</h3>
          <label className="flex items-center gap-2 mb-2">
            <input type="radio" name="nextSession" checked={form.nextSession === "followup"} onChange={() => setForm({ ...form, nextSession: "followup" })} />
            Follow-up
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="nextSession" checked={form.nextSession === "termination"} onChange={() => setForm({ ...form, nextSession: "termination" })} />
            Termination
          </label>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Counselor Signature</h3>
          <input className="w-full border rounded px-3 py-2" placeholder="Type counselor name as signature" value={form.counselorSignature} onChange={(e) => setForm({ ...form, counselorSignature: e.target.value })} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-maroon-600 text-white rounded disabled:opacity-50">
            {saving ? "Saving..." : (existingSessionId ? "Update Record" : "Save Record")}
          </button>
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
