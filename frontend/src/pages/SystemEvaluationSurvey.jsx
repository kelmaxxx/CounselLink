import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  RESEARCH_INFO,
  SUS_SCALE,
  SUS_QUESTIONS,
  computeSusScore,
} from "../data/systemEvaluationData";
import { CheckCircle, ArrowRight, ChevronDown, ChevronUp, AlertCircle, Eye, FileText } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function SystemEvaluationSurvey() {
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    respondentName: currentUser?.name || "",
    respondentType: currentUser?.role === "counselor" ? "guidance_counselor" : "student",
    q1: "", q2: "", q3: "", q4: "", q5: "",
    q6: "", q7: "", q8: "", q9: "", q10: "",
    comments: "",
  });

  const [showPart1, setShowPart1] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultScore, setResultScore] = useState(null);
  const [error, setError] = useState("");

  const handleRatingChange = (qId, val) => {
    setFormData((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.respondentName.trim()) {
      setError("Please enter your name as the evaluator.");
      return;
    }

    const missingQuestions = [];
    for (let i = 1; i <= 10; i++) {
      if (!formData[`q${i}`]) missingQuestions.push(i);
    }

    if (missingQuestions.length > 0) {
      setError(`Please provide ratings for question(s): ${missingQuestions.join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/system-evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentName: formData.respondentName,
          respondentType: formData.respondentType,
          q1: formData.q1, q2: formData.q2, q3: formData.q3, q4: formData.q4, q5: formData.q5,
          q6: formData.q6, q7: formData.q7, q8: formData.q8, q9: formData.q9, q10: formData.q10,
          comments: formData.comments,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to submit evaluation.");

      setResultScore(body.susScore);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Evaluation Submitted!</h2>
          <p className="text-slate-600 text-sm mb-6">
            Thank you, <span className="font-semibold text-slate-800">{formData.respondentName}</span>. Your evaluation for <span className="font-semibold">CounselLink</span> has been recorded.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Your Evaluated System Usability Score
            </span>
            <div className="text-4xl font-extrabold text-maroon-700">{resultScore} / 100</div>
          </div>

          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 bg-maroon-700 hover:bg-maroon-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition"
          >
            Return to Home Page <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header & Branding */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
          <div className="flex justify-center items-center gap-4 mb-3">
            <img src="/counselink-round.png" alt="MSU Logo" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {RESEARCH_INFO.university}
          </h2>
          <h3 className="text-xs font-semibold text-slate-500 tracking-wider">
            {RESEARCH_INFO.college}
          </h3>
          <h1 className="text-xl sm:text-2xl font-bold text-maroon-800 mt-3">
            System Evaluation Questionnaire
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl mx-auto">
            {RESEARCH_INFO.title}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span><strong>Researchers:</strong> {RESEARCH_INFO.researchers.map(r => r.name).join(" & ")}</span>
            <span><strong>Adviser:</strong> {RESEARCH_INFO.adviser.name}</span>
            <span><strong>Co-Adviser:</strong> {RESEARCH_INFO.co_adviser.name}</span>
          </div>
        </div>

        {/* PART I: PARTICIPANT INFORMATION SHEET (Document Images) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPart1(!showPart1)}
            className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-maroon-700 text-white text-xs font-bold flex items-center justify-center">
                I
              </span>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                  PART I. PARTICIPANT INFORMATION SHEET
                </h3>
                <p className="text-xs text-slate-500">Read study details, purpose, and confidentiality sheet</p>
              </div>
            </div>
            {showPart1 ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          {showPart1 && (
            <div className="p-6 space-y-6 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 text-center italic">
                (Click any page image below to expand and view in full size)
              </p>

              {/* Stack of Information Sheet Pages */}
              <div className="space-y-4 max-w-2xl mx-auto">
                <div
                  onClick={() => setSelectedImage("/info-sheet/page1.png")}
                  className="group relative cursor-pointer border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition bg-white"
                >
                  <img
                    src="/info-sheet/page1.png"
                    alt="Participant Information Sheet - Page 1"
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-medium text-xs gap-2">
                    <Eye size={18} /> Click to View Fullscreen (Page 1)
                  </div>
                </div>

                <div
                  onClick={() => setSelectedImage("/info-sheet/page2.png")}
                  className="group relative cursor-pointer border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition bg-white"
                >
                  <img
                    src="/info-sheet/page2.png"
                    alt="Participant Information Sheet - Page 2"
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-medium text-xs gap-2">
                    <Eye size={18} /> Click to View Fullscreen (Page 2)
                  </div>
                </div>

                <div
                  onClick={() => setSelectedImage("/info-sheet/page3.png")}
                  className="group relative cursor-pointer border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition bg-white"
                >
                  <img
                    src="/info-sheet/page3.png"
                    alt="Participant Information Sheet - Page 3"
                    className="w-full h-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-medium text-xs gap-2">
                    <Eye size={18} /> Click to View Fullscreen (Page 3)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PART II: SYSTEM EVALUATION QUESTIONNAIRE (SUS) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-maroon-700 text-white text-xs font-bold flex items-center justify-center">
                II
              </span>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  PART II. SYSTEM EVALUATION QUESTIONNAIRE
                </h3>
                <p className="text-xs text-slate-500">System Usability Scale (SUS)</p>
              </div>
            </div>
          </div>

          {/* Evaluator Identity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Evaluator Name *</label>
              <input
                type="text"
                required
                value={formData.respondentName}
                onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                placeholder="e.g. Juan De La Cruz"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-maroon-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Evaluator Classification *</label>
              <select
                value={formData.respondentType}
                onChange={(e) => setFormData({ ...formData, respondentType: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-maroon-500 bg-white"
              >
                <option value="student">Student</option>
                <option value="guidance_counselor">Guidance Counselor / Personnel</option>
                <option value="personnel">Faculty / Staff</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 space-y-2 border border-slate-200">
            <p><strong>Instruction:</strong> Please rate the following statements based on your experience using the CounselLink System.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium text-slate-700">
              <span><strong>1</strong> = Strongly Agree</span>
              <span><strong>2</strong> = Agree</span>
              <span><strong>3</strong> = Neutral</span>
              <span><strong>4</strong> = Disagree</span>
              <span><strong>5</strong> = Strongly Disagree</span>
            </div>
          </div>

          {/* SUS Rating Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 text-xs font-semibold uppercase">
                  <th className="py-3 px-4 w-12 text-center">No.</th>
                  <th className="py-3 px-4">Statement</th>
                  {SUS_SCALE.map((opt) => (
                    <th key={opt.value} className="py-3 px-2 w-16 sm:w-20 text-center font-bold text-slate-800">
                      {opt.value}
                      <span className="block text-[10px] font-normal text-slate-400 capitalize hidden sm:block">
                        {opt.label.split(" ")[0]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SUS_QUESTIONS.map((q) => {
                  const selectedVal = formData[q.id];
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-500 text-xs">{q.number}.</td>
                      <td className="py-3.5 px-4 text-slate-800 text-xs sm:text-sm font-medium leading-snug">
                        {q.text}
                      </td>
                      {SUS_SCALE.map((opt) => (
                        <td key={opt.value} className="py-3.5 px-2 text-center">
                          <label className="inline-flex items-center justify-center p-2 rounded-full cursor-pointer hover:bg-maroon-50">
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.value}
                              checked={String(selectedVal) === String(opt.value)}
                              onChange={() => handleRatingChange(q.id, opt.value)}
                              className="w-4 h-4 text-maroon-700 border-slate-300 focus:ring-maroon-500 cursor-pointer"
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Comments / Suggestions (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              placeholder="Share any feedback, observations, or suggestions regarding CounseLink..."
              className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              All responses are recorded securely for thesis research evaluation.
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 bg-maroon-700 hover:bg-maroon-800 text-white font-semibold rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </div>
        </form>
      </div>

      {/* Image Modal Lightbox for Information Sheet */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2 relative">
            <img
              src={selectedImage}
              alt="Participant Information Sheet Expanded"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
            <p className="text-center text-xs text-slate-500 mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
