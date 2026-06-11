import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments } from "../../context/AppointmentsContext";
import { MessageSquare, Star, CheckCircle2 } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  Modal,
  BTN,
  INPUT,
  LABEL,
  initialsOf,
  formatDate,
} from "../../components/ui";

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
    () =>
      (appointments || []).filter(
        (a) => a.student_id === currentUser?.id || a.studentId === currentUser?.id
      ),
    [appointments, currentUser?.id]
  );

  const completable = useMemo(() => myAppointments.filter(isCompletable), [myAppointments]);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="Student"
        title="Counseling feedback"
        subtitle="Rate and comment on completed sessions. Your counselor sees this immediately."
      />

      <SectionCard noBodyPadding>
        {completable.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No sessions ready for feedback"
            hint="Feedback unlocks after a scheduled session's date has passed."
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {completable.map((a) => (
              <li
                key={a.id}
                className="px-4 py-3 hover:bg-gray-50/70 transition flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-maroon-100 text-maroon-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initialsOf(a.counselorName) || "C"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.counselorName || "Counselor"}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums mt-0.5">
                      Session on {formatDate(a.scheduledDate || a.preferredDate)}
                      {a.scheduledTimeSlot ? ` at ${a.scheduledTimeSlot}` : ""}
                    </p>
                    {a.reason && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                        {a.reason}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setFeedbackForm({
                      appointmentId: a.id,
                      counselorId: a.counselor_id || a.counselorId,
                      counselorName: a.counselorName,
                    })
                  }
                  className={`${BTN.primary} h-8 px-2.5 text-xs flex-shrink-0`}
                >
                  Leave feedback
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {feedbackForm && (
        <FeedbackModal token={token} context={feedbackForm} onClose={() => setFeedbackForm(null)} />
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
      if (!res.ok) setError(body.message || "Failed to submit");
      else setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Leave feedback"
      subtitle={
        context.counselorName
          ? `For ${context.counselorName}`
          : "Your counselor will see this immediately."
      }
      footer={
        done ? (
          <button onClick={onClose} className={BTN.primary}>
            Close
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} className={BTN.secondary}>
              Cancel
            </button>
            <button
              type="submit"
              form="feedback-form"
              disabled={submitting}
              className={BTN.primary}
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-center space-y-3 py-3">
          <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
          <p className="text-sm font-medium text-gray-900">Thanks — your feedback was submitted.</p>
        </div>
      ) : (
        <form id="feedback-form" onSubmit={submit} className="space-y-3">
          <div>
            <label className={LABEL}>Rating *</label>
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
                    size={26}
                    fill={n <= (hovered || rating) ? "currentColor" : "none"}
                    stroke="currentColor"
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Comment (optional)</label>
            <textarea
              rows={4}
              className={INPUT}
              placeholder="Was the session helpful? What worked?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
