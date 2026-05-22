import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { MessageSquare, Star, X, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const isCompletable = (a) => {
  if (a.status !== "approved" && a.status !== "completed") return false;
  const dateStr = a.scheduledDate || a.preferredDate;
  if (!dateStr) return false;
  try {
    return new Date(dateStr) <= new Date();
  } catch {
    return false;
  }
};

export default function StudentFeedback() {
  const { token, currentUser } = useAuth();
  const { appointments, fetchAppointments } = useAppointments();
  const [feedbackForm, setFeedbackForm] = useState(null);

  useEffect(() => {
    fetchAppointments?.().catch(() => undefined);
  }, [fetchAppointments]);

  const myAppointments = useMemo(
    () => (appointments || []).filter((a) => a.student_id === currentUser?.id || a.studentId === currentUser?.id),
    [appointments, currentUser?.id]
  );

  const completable = useMemo(() => myAppointments.filter(isCompletable), [myAppointments]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="text-maroon-600" size={24} /> Counseling Feedback
        </h2>
        <p className="text-sm text-gray-600">
          Rate and comment on completed counseling sessions. Your counselor sees this immediately.
        </p>
      </div>

      {completable.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow p-8 text-center text-gray-500">
          You have no completed sessions yet. Feedback unlocks after your scheduled session date.
        </div>
      ) : (
        <ul className="space-y-3">
          {completable.map((a) => (
            <li key={a.id} className="bg-white border border-gray-200 rounded-xl shadow p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{a.counselorName || "Counselor"}</p>
                <p className="text-xs text-gray-500">
                  Session on {a.scheduledDate || a.preferredDate || "—"}{" "}
                  {a.scheduledTimeSlot ? `at ${a.scheduledTimeSlot}` : ""}
                </p>
                {a.reason && <p className="text-sm text-gray-700 mt-1 line-clamp-2">{a.reason}</p>}
              </div>
              <button
                onClick={() =>
                  setFeedbackForm({ appointmentId: a.id, counselorId: a.counselor_id || a.counselorId, counselorName: a.counselorName })
                }
                className="px-3 py-1.5 rounded bg-maroon-600 text-white text-xs hover:bg-maroon-700"
              >
                Leave Feedback
              </button>
            </li>
          ))}
        </ul>
      )}

      {feedbackForm && (
        <FeedbackModal
          token={token}
          context={feedbackForm}
          onClose={() => setFeedbackForm(null)}
        />
      )}
    </div>
  );
}

function FeedbackModal({ token, context, onClose }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!rating) {
      setError("Please choose a rating from 1 to 5 stars.");
      return;
    }
    if (!context.counselorId) {
      setError("Missing counselor. Refresh and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          counselorId: context.counselorId,
          appointmentId: context.appointmentId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || "Failed to submit");
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Leave Feedback</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {context.counselorName ? `For ${context.counselorName}` : "Your counselor will see this immediately."}
        </p>

        {done ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 size={48} className="text-green-600 mx-auto" />
            <p className="text-sm font-medium text-gray-900">Thanks — your feedback was submitted.</p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded bg-maroon-600 text-white hover:bg-maroon-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
              <div className="flex items-center gap-1 text-amber-500">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                    className="p-0.5"
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  >
                    <Star
                      size={28}
                      fill={n <= (hovered || rating) ? "currentColor" : "none"}
                      stroke="currentColor"
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
              <textarea
                rows={4}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-maroon-500"
                placeholder="Was the session helpful? What worked?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
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
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
