import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Printer, ClipboardList, ThumbsUp, Star, MessageSquare } from "lucide-react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  BTN,
  INPUT,
  LABEL,
} from "../../components/ui";
import {
  LIKERT_SCALE,
  SATISFACTION_SCALE,
  RELATIONSHIP_ITEMS,
  OUTCOME_ITEMS,
  ALL_LIKERT_ITEMS,
} from "../../data/clientFeedbackForm";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// MSU-style academic calendar heuristic: 1st sem ~Aug-Dec, 2nd sem ~Jan-May,
// midyear ~Jun-Jul. There's no semester concept stored in the DB, so this is
// just a convenience default for the date filter — counselors can always
// override it with a custom range.
function getCurrentSemesterRange(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const pad = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (month >= 8) {
    return { from: pad(year, 8, 1), to: pad(year, 12, 31), label: `1st Semester ${year}-${year + 1}` };
  }
  if (month <= 5) {
    return { from: pad(year - 1, 1, 1), to: pad(year, 5, 31), label: `2nd Semester ${year - 1}-${year}` };
  }
  return { from: pad(year, 6, 1), to: pad(year, 7, 31), label: `Midyear ${year}` };
}

const emptyTally = {
  count: 0,
  perQuestion: {},
  overallSatisfaction: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: null },
  rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, average: null },
  recommend: { yes: 0, no: 0, not_sure: 0 },
  comments: [],
};

const fmtLongDate = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => rows.map((row) => row.map(csvCell).join(",")).join("\n");

export default function FeedbackTallySummary() {
  const { token, currentUser } = useAuth();
  const semesterRange = useMemo(() => getCurrentSemesterRange(), []);
  const [filters, setFilters] = useState({ from: semesterRange.from, to: semesterRange.to });
  const [tally, setTally] = useState(emptyTally);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTally = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ counselorId: "me" });
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`${API_BASE}/api/client-feedback/tally?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Unable to load tally");
      setTally(body);
    } catch (err) {
      setError(err.message);
      setTally(emptyTally);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTally();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.from, filters.to]);

  const applyThisSemester = () => setFilters({ from: semesterRange.from, to: semesterRange.to });
  const applyAllTime = () => setFilters({ from: "", to: "" });

  const averageOfKeys = (keys) => {
    const values = keys
      .map((k) => tally.perQuestion[k]?.average)
      .filter((v) => v !== null && v !== undefined);
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const relationshipAvg = averageOfKeys(RELATIONSHIP_ITEMS.map((i) => i.key));
  const outcomeAvg = averageOfKeys(OUTCOME_ITEMS.map((i) => i.key));

  const recommendTotal = tally.recommend.yes + tally.recommend.no + tally.recommend.not_sure;
  const recommendRate = recommendTotal ? (tally.recommend.yes / recommendTotal) * 100 : null;

  const analysis = useMemo(() => {
    if (!tally.count) return null;
    const scored = ALL_LIKERT_ITEMS.map((item) => ({
      ...item,
      average: tally.perQuestion[item.key]?.average,
    })).filter((item) => item.average !== null && item.average !== undefined);
    if (!scored.length) return null;

    const overallAvg = scored.reduce((sum, item) => sum + item.average, 0) / scored.length;
    const strongest = scored.reduce((a, b) => (b.average > a.average ? b : a));
    const weakest = scored.reduce((a, b) => (b.average < a.average ? b : a));

    let bucket = "Needs improvement";
    if (overallAvg >= 4.5) bucket = "Excellent";
    else if (overallAvg >= 3.5) bucket = "Good";
    else if (overallAvg >= 2.5) bucket = "Fair";

    return { overallAvg, strongest, weakest, bucket };
  }, [tally]);

  const fmt = (n) => (n === null || n === undefined ? "—" : n.toFixed(2));

  const dateRangeLabel = useMemo(() => {
    if (!filters.from && !filters.to) return "All time";
    const fromLabel = fmtLongDate(filters.from);
    const toLabel = fmtLongDate(filters.to);
    const isCurrentSemester = filters.from === semesterRange.from && filters.to === semesterRange.to;
    return isCurrentSemester
      ? `${fromLabel} - ${toLabel} (${semesterRange.label})`
      : `${fromLabel} - ${toLabel}`;
  }, [filters, semesterRange]);

  const exportTallySummary = () => {
    const rows = [];
    rows.push(["Counselor name:", currentUser?.name || ""]);
    rows.push(["Date:", dateRangeLabel]);
    rows.push([]);

    const addSection = (title, items, startIndex) => {
      rows.push([title]);
      rows.push(["#", "Statement", ...LIKERT_SCALE.map((s) => s.label), "Average"]);
      items.forEach((item, i) => {
        const q = tally.perQuestion[item.key] || {};
        rows.push([
          startIndex + i,
          item.text,
          ...LIKERT_SCALE.map((s) => q[s.value] || 0),
          q.average != null ? q.average.toFixed(2) : "",
        ]);
      });
      rows.push([]);
    };

    addSection("A. About the working relationship with your Counselor", RELATIONSHIP_ITEMS, 1);
    addSection(
      "B. About the results of working with your counselor",
      OUTCOME_ITEMS,
      RELATIONSHIP_ITEMS.length + 1
    );

    rows.push(["Overall satisfaction"]);
    rows.push([...SATISFACTION_SCALE.map((s) => s.label), "Average"]);
    rows.push([
      ...SATISFACTION_SCALE.map((s) => tally.overallSatisfaction[s.value] || 0),
      tally.overallSatisfaction.average != null ? tally.overallSatisfaction.average.toFixed(2) : "",
    ]);
    rows.push([]);

    rows.push(["Quick star rating"]);
    rows.push(["5 stars", "4 stars", "3 stars", "2 stars", "1 star", "Average"]);
    rows.push([
      ...[5, 4, 3, 2, 1].map((v) => tally.rating?.[v] || 0),
      tally.rating?.average != null ? tally.rating.average.toFixed(2) : "",
    ]);
    rows.push([]);

    rows.push(["Would recommend to others"]);
    rows.push(["Yes", "No", "Not sure", "Recommend rate"]);
    rows.push([
      tally.recommend.yes,
      tally.recommend.no,
      tally.recommend.not_sure,
      recommendRate === null ? "" : `${recommendRate.toFixed(0)}%`,
    ]);
    rows.push([]);

    rows.push(["Comments (anonymous)"]);
    if (tally.comments.length === 0) {
      rows.push(["No comments"]);
    } else {
      tally.comments.forEach((c) => rows.push([c]));
    }

    if (analysis) {
      rows.push([]);
      rows.push(["Analysis"]);
      rows.push([
        `Overall average across all 12 statements is ${analysis.overallAvg.toFixed(2)} / 5 — rated ${analysis.bucket}.`,
      ]);
      rows.push([
        `Strongest-rated statement: "${analysis.strongest.text}" (avg ${analysis.strongest.average.toFixed(2)}).`,
      ]);
      rows.push([
        `Lowest-rated statement: "${analysis.weakest.text}" (avg ${analysis.weakest.average.toFixed(2)}).`,
      ]);
      rows.push([
        recommendRate === null
          ? "No recommendation data yet."
          : `${recommendRate.toFixed(0)}% of respondents would recommend this counselor to others.`,
      ]);
    }

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (currentUser?.name || "counselor").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    link.href = url;
    link.download = `feedback-tally-summary_${safeName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Counselor"
        title="Feedback Tally Summary"
        subtitle="Auto-computed results from the Client Feedback Form. Responses are anonymous and shown only in aggregate."
        actions={
          <button onClick={exportTallySummary} className={BTN.primary}>
            <Printer size={14} /> Print
          </button>
        }
      />

      <div>
        <SectionCard title="Filters" subtitle="Pick a date range or use a quick preset" className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-2">
              <button onClick={applyThisSemester} className={BTN.secondary}>
                This semester
              </button>
              <button onClick={applyAllTime} className={BTN.secondary}>
                All time
              </button>
            </div>
            <div>
              <label className={LABEL}>Date from</label>
              <input
                type="date"
                className={INPUT}
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL}>Date to</label>
              <input
                type="date"
                className={INPUT}
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>
        </SectionCard>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <SectionCard noBodyPadding>
            <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
          </SectionCard>
        ) : !tally.count ? (
          <SectionCard noBodyPadding>
            <EmptyState
              icon={ClipboardList}
              title="No feedback forms in this range"
              hint="When students submit the Client Feedback Form, the tally appears here."
            />
          </SectionCard>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <StatCard label="Total responses" value={tally.count} icon={ClipboardList} accent="bg-maroon-500" />
              <StatCard
                label="Avg. star rating"
                value={`${fmt(tally.rating?.average)} / 5`}
                hint="Quick rating"
                icon={Star}
                accent="bg-amber-500"
              />
              <StatCard
                label="Avg. relationship score"
                value={fmt(relationshipAvg)}
                hint="Out of 5 · 10 statements"
                icon={Star}
                accent="bg-blue-500"
              />
              <StatCard
                label="Avg. outcome score"
                value={fmt(outcomeAvg)}
                hint="Out of 5 · 2 statements"
                icon={Star}
                accent="bg-emerald-500"
              />
              <StatCard
                label="Recommend rate"
                value={recommendRate === null ? "—" : `${recommendRate.toFixed(0)}%`}
                hint={`${tally.recommend.yes} of ${recommendTotal} said yes`}
                icon={ThumbsUp}
                accent="bg-amber-500"
              />
            </div>

            <SectionCard
              title="About the working relationship with your Counselor"
              subtitle="Tally by statement"
              className="mb-4"
              noBodyPadding
            >
              <TallyTable items={RELATIONSHIP_ITEMS} perQuestion={tally.perQuestion} startIndex={1} />
            </SectionCard>

            <SectionCard
              title="About the results of working with your counselor"
              subtitle="Tally by statement"
              className="mb-4"
              noBodyPadding
            >
              <TallyTable
                items={OUTCOME_ITEMS}
                perQuestion={tally.perQuestion}
                startIndex={RELATIONSHIP_ITEMS.length + 1}
              />
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <SectionCard title="Quick star rating">
                <dl className="space-y-2 text-sm">
                  {[5, 4, 3, 2, 1].map((v) => (
                    <div key={v} className="flex items-center justify-between">
                      <dt className="text-gray-600">{v} star{v === 1 ? "" : "s"}</dt>
                      <dd className="font-medium text-gray-900 tabular-nums">{tally.rating?.[v] || 0}</dd>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                    <dt className="font-semibold text-gray-900">Average</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">
                      {fmt(tally.rating?.average)} / 5
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Overall satisfaction">
                <dl className="space-y-2 text-sm">
                  {SATISFACTION_SCALE.map((opt) => (
                    <div key={opt.value} className="flex items-center justify-between">
                      <dt className="text-gray-600">{opt.label}</dt>
                      <dd className="font-medium text-gray-900 tabular-nums">
                        {tally.overallSatisfaction[opt.value] || 0}
                      </dd>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                    <dt className="font-semibold text-gray-900">Average</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">
                      {fmt(tally.overallSatisfaction.average)} / 5
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Would recommend to others">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Yes</dt>
                    <dd className="font-medium text-gray-900 tabular-nums">{tally.recommend.yes}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">No</dt>
                    <dd className="font-medium text-gray-900 tabular-nums">{tally.recommend.no}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Not sure</dt>
                    <dd className="font-medium text-gray-900 tabular-nums">{tally.recommend.not_sure}</dd>
                  </div>
                  <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                    <dt className="font-semibold text-gray-900">Recommend rate</dt>
                    <dd className="font-semibold text-gray-900 tabular-nums">
                      {recommendRate === null ? "—" : `${recommendRate.toFixed(0)}%`}
                    </dd>
                  </div>
                </dl>
              </SectionCard>
            </div>

            {analysis && (
              <SectionCard title="Analysis" subtitle="Auto-generated from the figures above" className="mb-4">
                <ul className="text-sm text-gray-700 space-y-2 list-disc pl-4">
                  <li>
                    Overall average across all 12 statements is{" "}
                    <span className="font-semibold tabular-nums">{fmt(analysis.overallAvg)} / 5</span> —
                    rated <span className="font-semibold">{analysis.bucket}</span>.
                  </li>
                  <li>
                    Strongest-rated statement: <span className="italic">"{analysis.strongest.text}"</span>{" "}
                    (avg {fmt(analysis.strongest.average)}).
                  </li>
                  <li>
                    Lowest-rated statement: <span className="italic">"{analysis.weakest.text}"</span>{" "}
                    (avg {fmt(analysis.weakest.average)}) — an area to consider for improvement.
                  </li>
                  <li>
                    {recommendRate === null
                      ? "No recommendation data yet."
                      : `${recommendRate.toFixed(0)}% of respondents would recommend this counselor to others.`}
                  </li>
                </ul>
              </SectionCard>
            )}

            <SectionCard
              title="Comments"
              subtitle="Anonymous — not attributed to any student"
              noBodyPadding
            >
              {tally.comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments in this range" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {tally.comments.map((c, i) => (
                    <li key={i} className="px-4 py-3 text-sm text-gray-700 leading-relaxed">
                      "{c}"
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

function TallyTable({ items, perQuestion, startIndex }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/60 border-b border-gray-100">
            <th className="px-4 py-2.5">Statement</th>
            {LIKERT_SCALE.map((opt) => (
              <th key={opt.value} className="px-3 py-2.5 text-center">
                {opt.label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center">Average</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => {
            const q = perQuestion[item.key] || {};
            return (
              <tr key={item.key} className="hover:bg-gray-50/70 transition">
                <td className="px-4 py-3 text-gray-800">
                  <span className="text-gray-400 mr-1">{startIndex + i}.</span>
                  {item.text}
                </td>
                {LIKERT_SCALE.map((opt) => (
                  <td key={opt.value} className="px-3 py-3 text-center text-gray-700 tabular-nums">
                    {q[opt.value] || 0}
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-semibold text-gray-900 tabular-nums">
                  {q.average === null || q.average === undefined ? "—" : q.average.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
