import React, { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { Modal, BTN, INPUT, LABEL } from "../../components/ui";
import {
  LIKERT_SCALE,
  SATISFACTION_SCALE,
  RECOMMEND_OPTIONS,
  RELATIONSHIP_ITEMS,
  OUTCOME_ITEMS,
  RESPONSE_KEYS,
} from "../../data/clientFeedbackForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function ScaleHeader({ scale }) {
  return (
    <div className="hidden sm:grid grid-cols-5 gap-1 text-center mb-1.5">
      {scale.map((opt) => (
        <span key={opt.value} className="text-[10px] font-medium text-gray-500 leading-tight px-0.5">
          {opt.label}
        </span>
      ))}
    </div>
  );
}

function LikertRow({ index, text, scale, value, onChange, name }) {
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-b-0">
      <p className="text-sm text-gray-800 mb-1.5">
        <span className="text-gray-400 mr-1">{index}.</span>
        {text}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {scale.map((opt) => (
          <label
            key={opt.value}
            className="flex flex-col items-center gap-0.5 cursor-pointer"
            title={opt.label}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-maroon-600"
            />
            <span className="sm:hidden text-[9px] text-gray-500 text-center leading-tight">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star size={26} fill={n <= (hovered || value) ? "currentColor" : "none"} stroke="currentColor" />
        </button>
      ))}
    </div>
  );
}

export function ClientFeedbackFormModal({ token, context, onClose }) {
  const [responses, setResponses] = useState({});
  const [satisfaction, setSatisfaction] = useState(null);
  const [recommend, setRecommend] = useState(null);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const setAnswer = (key, value) => setResponses((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const unanswered = RESPONSE_KEYS.filter((k) => !responses[k]);
    if (unanswered.length) {
      setError("Please answer all 12 statements above.");
      return;
    }
    if (!satisfaction) {
      setError("Please choose your overall satisfaction.");
      return;
    }
    if (!recommend) {
      setError("Please answer whether you'd recommend your counselor.");
      return;
    }
    if (!rating) {
      setError("Please choose a star rating.");
      return;
    }
    if (!context.counselorId) {
      setError("Missing counselor. Refresh and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/client-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          counselorId: context.counselorId,
          appointmentId: context.appointmentId,
          responses,
          overallSatisfaction: satisfaction,
          wouldRecommend: recommend,
          rating,
          comments: comments.trim() || null,
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
      title=""
      size="2xl"
      align="top"
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
              form="client-feedback-form"
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
          <p className="text-sm font-medium text-gray-900">
            Thanks — your Client Feedback Form was submitted.
          </p>
        </div>
      ) : (
        <form id="client-feedback-form" onSubmit={submit} className="space-y-5">
          <div className="text-center -mt-2 mb-1">
            <img
              src="/header.png"
              alt="Mindanao State University - Main Campus · Division of Student Affairs · Guidance and Counseling Section"
              className="w-full max-h-28 object-contain mx-auto"
            />
            <h2 className="mt-2 text-lg font-bold uppercase tracking-wide text-gray-900">
              Client Feedback Form
            </h2>
            {context.counselorName && (
              <p className="text-sm text-gray-500 mt-0.5">For {context.counselorName}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
            This form allows you an opportunity to provide feedback to your counselor. This will
            help your counselor's professional development as well as improve the service offered
            to others. <span className="font-medium text-gray-700">You DO NOT need to identify yourself.</span>
          </p>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              About the working relationship with your Counselor
            </h4>
            <ScaleHeader scale={LIKERT_SCALE} />
            {RELATIONSHIP_ITEMS.map((item, i) => (
              <LikertRow
                key={item.key}
                index={i + 1}
                text={item.text}
                scale={LIKERT_SCALE}
                value={responses[item.key]}
                onChange={(v) => setAnswer(item.key, v)}
                name={item.key}
              />
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              About the results of working with your counselor
            </h4>
            <ScaleHeader scale={LIKERT_SCALE} />
            {OUTCOME_ITEMS.map((item, i) => (
              <LikertRow
                key={item.key}
                index={RELATIONSHIP_ITEMS.length + i + 1}
                text={item.text}
                scale={LIKERT_SCALE}
                value={responses[item.key]}
                onChange={(v) => setAnswer(item.key, v)}
                name={item.key}
              />
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Overall satisfaction</h4>
            <ScaleHeader scale={SATISFACTION_SCALE} />
            <LikertRow
              index={13}
              text="My overall satisfaction with the service provided by my counselor is:"
              scale={SATISFACTION_SCALE}
              value={satisfaction}
              onChange={setSatisfaction}
              name="satisfaction"
            />
          </div>

          <div>
            <label className={LABEL}>
              Based on my experience, I would recommend my counselor to others
            </label>
            <div className="flex gap-4">
              {RECOMMEND_OPTIONS.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="recommend"
                    value={opt.value}
                    checked={recommend === opt.value}
                    onChange={() => setRecommend(opt.value)}
                    className="accent-maroon-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Other comments (optional)</label>
            <textarea
              rows={4}
              className={INPUT}
              placeholder="Anything else you'd like to share?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-gray-100 text-center">
            <label className={`${LABEL} text-center`}>Rate your overall experience</label>
            <div className="flex justify-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

export default ClientFeedbackFormModal;
