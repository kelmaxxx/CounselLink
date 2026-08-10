import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import { SUS_QUESTIONS, SUS_SCALE, getSusGrade } from "../../data/systemEvaluationData";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  BTN,
} from "../../components/ui";
import {
  ClipboardList,
  BarChart3,
  Copy,
  Check,
  Printer,
  Award,
  Users,
  FileSpreadsheet,
  ExternalLink,
  Lock,
  ShieldCheck,
  Key,
  RefreshCw,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/* ── Excel Export Utility ─────────────────────────────────────────── */

const ACCEPTED_PASSCODES = ["counselink2026", "1234", "cics2026"];

export default function SystemEvaluationTally() {
  const { token } = useAuth();

  const [storedPasscode, setStoredPasscode] = useState(() => {
    return sessionStorage.getItem("researcher_passcode") || "";
  });

  const [isUnlocked, setIsUnlocked] = useState(() => {
    const code = sessionStorage.getItem("researcher_passcode");
    return Boolean(code && ACCEPTED_PASSCODES.includes(code.trim()));
  });

  const [inputPasscode, setInputPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const [tally, setTally] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const surveyUrl = `${window.location.origin}/system-evaluation`;

  const fetchTally = async () => {
    if (!isUnlocked) return;
    setLoading(true);
    setError("");
    try {
      const headers = {
        "x-researcher-passcode": storedPasscode || "1234",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/system-evaluations/tally`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Failed to fetch evaluation tally.");
      setTally(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      fetchTally();
    }
  }, [token, isUnlocked, storedPasscode]);

  const handleUnlock = (e) => {
    e.preventDefault();
    setPasscodeError("");
    const trimmed = inputPasscode.trim();
    if (ACCEPTED_PASSCODES.includes(trimmed)) {
      sessionStorage.setItem("researcher_passcode", trimmed);
      setStoredPasscode(trimmed);
      setIsUnlocked(true);
    } else {
      setPasscodeError("Invalid passcode. Access restricted to thesis researchers.");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const exportExcel = () => {
    if (!tally || !tally.count) return;

    const wb = XLSX.utils.book_new();

    /* ── Sheet 1: Summary ─────────────────────────────────────────── */
    const summaryData = [
      ["CounselLink – System Usability Scale (SUS) Evaluation Report"],
      [],
      ["Report Generated", new Date().toLocaleString()],
      ["Total Respondents", tally.count],
      ["Average SUS Score", tally.averageSusScore],
      ["Out Of", 100],
      ["Grade Rating", tally.grade],
      ["Acceptability", tally.acceptability],
      [],
      ["SUS Score Interpretation Guide"],
      ["Score Range", "Grade", "Adjective", "Acceptability"],
      ["80.3 – 100", "A", "Excellent", "Acceptable"],
      ["68.0 – 80.2", "B", "Good", "Acceptable"],
      ["51.0 – 67.9", "C", "OK", "Marginal"],
      ["35.7 – 50.9", "D", "Poor", "Not Acceptable"],
      ["0 – 35.6", "F", "Awful", "Not Acceptable"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 24 }, { wch: 22 }, { wch: 14 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    /* ── Sheet 2: Tallied Results Per Statement ───────────────────── */
    const tallyHeader = [
      "#",
      "SUS Statement",
      ...SUS_SCALE.map((s) => `${s.label} (${s.value})`),
      "Total Responses",
      "Average Rating",
    ];
    const tallyRows = SUS_QUESTIONS.map((q) => {
      const pq = tally.perQuestion[q.id] || {};
      const counts = SUS_SCALE.map((s) => pq[s.value] || 0);
      const totalResp = counts.reduce((a, b) => a + b, 0);
      return [
        q.number,
        q.text,
        ...counts,
        totalResp,
        pq.average ? Number(pq.average.toFixed(2)) : 0,
      ];
    });
    const tallyData = [tallyHeader, ...tallyRows];
    const wsTally = XLSX.utils.aoa_to_sheet(tallyData);
    wsTally["!cols"] = [
      { wch: 4 },   // #
      { wch: 70 },  // Statement
      { wch: 18 },  // SA
      { wch: 10 },  // A
      { wch: 10 },  // N
      { wch: 12 },  // D
      { wch: 20 },  // SD
      { wch: 16 },  // Total
      { wch: 16 },  // Avg
    ];
    XLSX.utils.book_append_sheet(wb, wsTally, "Tally Per Statement");

    /* ── Sheet 3: Respondent List (no raw answers, just scores) ─── */
    const respHeader = ["#", "Respondent Name", "Classification", "Date Submitted", "SUS Score", "Comments"];
    const respRows = (tally.evaluations || []).map((e, idx) => [
      idx + 1,
      e.respondentName,
      (e.respondentType || "").replace("_", " "),
      new Date(e.createdAt).toLocaleDateString(),
      e.susScore,
      e.comments || "",
    ]);
    const respData = [respHeader, ...respRows];
    const wsResp = XLSX.utils.aoa_to_sheet(respData);
    wsResp["!cols"] = [
      { wch: 5 },   // #
      { wch: 28 },  // Name
      { wch: 22 },  // Classification
      { wch: 16 },  // Date
      { wch: 12 },  // Score
      { wch: 40 },  // Comments
    ];
    XLSX.utils.book_append_sheet(wb, wsResp, "Respondents");

    /* ── Sheet 4: Per-Respondent Question Breakdown ───────────────── */
    const breakdownHeader = [
      "#",
      "Respondent Name",
      ...SUS_QUESTIONS.map((q) => `Q${q.number}`),
      "Overall SUS Score",
    ];
    const breakdownRows = (tally.evaluations || []).map((e, idx) => [
      idx + 1,
      e.respondentName,
      ...SUS_QUESTIONS.map((q) => e.answers?.[q.id] ?? ""),
      e.susScore,
    ]);
    // Average row at the bottom
    const avgRow = [
      "",
      `Average (n=${tally.count})`,
      ...SUS_QUESTIONS.map((q) => {
        const pq = tally.perQuestion[q.id] || {};
        return pq.average ? Number(pq.average.toFixed(2)) : 0;
      }),
      tally.averageSusScore,
    ];
    breakdownRows.push(avgRow);

    const breakdownData = [breakdownHeader, ...breakdownRows];
    const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownData);
    wsBreakdown["!cols"] = [
      { wch: 5 },   // #
      { wch: 28 },  // Respondent Name
      ...SUS_QUESTIONS.map(() => ({ wch: 8 })),  // Q1-Q10
      { wch: 18 },  // Overall SUS Score
    ];
    XLSX.utils.book_append_sheet(wb, wsBreakdown, "Per Respondent Breakdown");

    /* ── Download ──────────────────────────────────────────────────── */
    const fileName = `CounselLink_SUS_Evaluation_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const gradeInfo = tally ? getSusGrade(tally.averageSusScore) : null;

  // Passcode Protection Gate
  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-14 h-14 bg-maroon-100 text-maroon-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Researchers Access Portal</h2>
          <p className="text-xs text-slate-500 mb-6">
            Survey results are restricted to researchers (Abdensa & Abdulmalik) to preserve study confidentiality.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                placeholder="Enter researcher passcode (e.g. 1234)"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-maroon-500 font-mono"
              />
            </div>

            {passcodeError && (
              <p className="text-xs text-red-600 font-medium">{passcodeError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-maroon-700 hover:bg-maroon-800 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} /> Unlock Survey Tally
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Passcode hint: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">1234</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">counselink2026</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Researchers Access Portal"
        title="System Usability Scale (SUS) Tally"
        subtitle="Confidential evaluation results & automatic tallying for Abdensa C. Macatanong & Abdulmalik M. Gampong."
        actions={
          <div className="flex gap-2">
            <button onClick={fetchTally} className={BTN.secondary} title="Refresh tally data">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={exportExcel} disabled={!tally?.count} className={BTN.secondary}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
            <button onClick={handlePrint} className={BTN.primary}>
              <Printer size={14} /> Print Summary
            </button>
          </div>
        }
      />

      {/* Shareable Link Card */}
      <SectionCard title="Share Survey Link" subtitle="Direct link to send respondents to answer the SUS evaluation questionnaire">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-mono select-all truncate">
            {surveyUrl}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={copyLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-maroon-700 hover:bg-maroon-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied Link!" : "Copy Link"}
            </button>
            <a
              href={surveyUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Open survey in new tab"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </SectionCard>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <SectionCard>
          <div className="py-12 text-center text-slate-500 text-sm">Loading tally data...</div>
        </SectionCard>
      ) : !tally || tally.count === 0 ? (
        <SectionCard noBodyPadding>
          <EmptyState
            icon={ClipboardList}
            title="No evaluation submissions yet"
            hint="Share the link above with respondents to start gathering SUS usability scores."
          />
        </SectionCard>
      ) : (
        <>
          {/* Top Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Respondents"
              value={tally.count}
              icon={Users}
              accent="bg-maroon-600"
            />

            <StatCard
              label="Average SUS Score"
              value={`${tally.averageSusScore} / 100`}
              hint="System Usability Scale"
              icon={BarChart3}
              accent="bg-blue-600"
            />

            <StatCard
              label="Usability Grade"
              value={`Grade ${tally.grade}`}
              hint={gradeInfo?.label}
              icon={Award}
              accent="bg-emerald-600"
            />

            <StatCard
              label="Acceptability Rating"
              value={tally.acceptability.split(" ")[0]}
              hint={tally.acceptability}
              icon={ClipboardList}
              accent="bg-amber-600"
            />
          </div>

          {/* Statement Tally Table */}
          <SectionCard
            title="System Usability Scale (SUS) Item Tally"
            subtitle="Counts and average rating per statement (1 = Strongly Agree, 5 = Strongly Disagree)"
            noBodyPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Statement</th>
                    {SUS_SCALE.map((s) => (
                      <th key={s.value} className="px-3 py-3 text-center">
                        {s.value} ({s.label.split(" ")[0]})
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SUS_QUESTIONS.map((q) => {
                    const pq = tally.perQuestion[q.id] || {};
                    return (
                      <tr key={q.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 text-center font-semibold text-slate-400">{q.number}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{q.text}</td>
                        {SUS_SCALE.map((s) => (
                          <td key={s.value} className="px-3 py-3 text-center font-mono text-slate-600">
                            {pq[s.value] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-maroon-700 font-mono">
                          {pq.average ? pq.average.toFixed(2) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Per-Respondent Breakdown Table (Q1-Q10 + Overall) */}
          <SectionCard
            title="Per-Respondent Question Breakdown"
            subtitle="Each respondent's individual ratings per question (Q1–Q10) and their overall SUS score"
            noBodyPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3 whitespace-nowrap">Respondent</th>
                    {SUS_QUESTIONS.map((q) => (
                      <th key={q.id} className="px-3 py-3 text-center whitespace-nowrap">
                        Q{q.number}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center whitespace-nowrap">Overall SUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tally.evaluations.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{e.respondentName}</td>
                      {SUS_QUESTIONS.map((q) => (
                        <td key={q.id} className="px-3 py-3 text-center font-mono text-slate-600">
                          {e.answers?.[q.id] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-maroon-50 text-maroon-700 border border-maroon-100">
                          {e.susScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Average row at bottom */}
                  <tr className="bg-maroon-50/40 border-t-2 border-maroon-200 font-semibold">
                    <td className="px-4 py-3 text-center text-maroon-700" colSpan={2}>
                      Average (n={tally.count})
                    </td>
                    {SUS_QUESTIONS.map((q) => {
                      const pq = tally.perQuestion[q.id] || {};
                      return (
                        <td key={q.id} className="px-3 py-3 text-center font-mono text-maroon-700">
                          {pq.average ? pq.average.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-mono font-bold text-maroon-800">
                      {tally.averageSusScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Individual Evaluations List */}
          <SectionCard
            title="Submitted Evaluations List"
            subtitle={`Total ${tally.evaluations.length} evaluation records`}
            noBodyPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                    <th className="px-4 py-3">Respondent Name</th>
                    <th className="px-4 py-3">Classification</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-center">SUS Score</th>
                    <th className="px-4 py-3">Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tally.evaluations.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">{e.respondentName}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                        {e.respondentType?.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-maroon-50 text-maroon-700 border border-maroon-100">
                          {e.susScore} / 100
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                        {e.comments || <span className="text-slate-300">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
