// Counselor dashboard charts rebuilt with shadcn structure
// (Card + ChartContainer + ChartTooltip + LabelList / interactive Area).
// Chart types, data flow, and colors stay identical to the current
// dashboard — only the presentation layer is shadcn-style.
import React from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../shadcn/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../shadcn/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../shadcn/select";
import { EmptyState, Modal, BTN } from "../ui";
import { contrastTextColor } from "../../data/sagayanColors";

// ── Students by college → shadcn "Bar Chart - Custom Label" ─────────────
// Same vertical ranked-bar type as RankedBarChart: rows sorted high→low,
// optional maxRows collapses the tail into "Others", click opens the full
// ranked modal. Per-college fill colors are preserved via <Cell>.
export function StudentsByCollegeCard({
  data = [],
  emptyIcon,
  emptyTitle = "No students yet",
  rowHeight = 40,
  maxRows,
  othersColor = "#94a3b8",
  title = "Students by College",
  subtitle = "Ranked distribution of your caseload",
  className = "",
}) {
  const ranked = React.useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data]
  );
  const sorted = React.useMemo(() => {
    if (maxRows && ranked.length > maxRows) {
      const head = ranked.slice(0, maxRows - 1);
      const tail = ranked.slice(maxRows - 1);
      const othersValue = tail.reduce((sum, d) => sum + d.value, 0);
      return [
        ...head,
        { name: `Others (${tail.length})`, value: othersValue, color: othersColor },
      ];
    }
    return ranked;
  }, [ranked, maxRows, othersColor]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const totalVal = React.useMemo(
    () => ranked.reduce((sum, d) => sum + d.value, 0),
    [ranked]
  );
  const maxValue = React.useMemo(
    () => (ranked.length ? Math.max(...ranked.map((d) => d.value)) : 1),
    [ranked]
  );
  const top = ranked[0];
  const topPct = top && totalVal ? Math.round((top.value / totalVal) * 100) : 0;

  if (!data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Students by college</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState icon={emptyIcon} title={emptyTitle} />
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    value: { label: "Students", color: "#0B6623" },
    label: { color: "var(--background)" },
  };
  const chartHeight = Math.max(sorted.length * rowHeight, rowHeight);
  const isTruncated = maxRows && ranked.length > maxRows;

  // shadcn "custom label" style: college code sits INSIDE the bar
  // (like the reference), value sits outside on the right. Bars with
  // tiny widths can't hold text, so the label falls back to just
  // outside the bar in dark gray. Text color adapts to the bar fill
  // (white on dark fills, dark on light fills like CSSH yellow).
  const renderCollegeLabel = (props) => {
    const { x = 0, y = 0, width = 0, height = 0, value, index } = props || {};
    const entry = sorted[index];
    const fits = width > 64;
    const fill = fits
      ? contrastTextColor(entry?.color)
      : "#374151";
    return (
      <text
        x={fits ? x + 8 : x + width + 8}
        y={y + height / 2}
        dy="0.35em"
        textAnchor="start"
        fontSize={12}
        fontWeight={600}
        fill={fill}
      >
        {value}
      </text>
    );
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle>Students by college</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onClick={() => setModalOpen(true)}
            className="cursor-pointer rounded-xl transition duration-150 hover:bg-gray-50/50 p-1"
            title="Click to view full distribution list"
          >
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: chartHeight }}
            >
              <BarChart
                accessibilityLayer
                data={sorted}
                layout="vertical"
                margin={{ top: 4, right: 44, left: 4, bottom: 4 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                />
                <YAxis dataKey="name" type="category" hide />
                <XAxis dataKey="value" type="number" hide />
                <ChartTooltip
                  cursor={{ fill: "#f8fafc" }}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      config={chartConfig}
                    />
                  }
                />
                <Bar dataKey="value" radius={4} maxBarSize={22}>
                  {sorted.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                  <LabelList dataKey="name" content={renderCollegeLabel} />
                  <LabelList
                    dataKey="value"
                    position="right"
                    offset={8}
                    style={{ fontSize: 12, fill: "#111827", fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 leading-none font-medium text-gray-900">
            {top ? (
              <>
                {top.name} leads with {topPct}% of caseload
                <TrendingUp className="h-4 w-4 text-maroon-600" />
              </>
            ) : (
              <>
                No distribution yet
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </>
            )}
          </div>
          <div className="leading-none text-muted-foreground text-gray-500 text-xs">
            {isTruncated
              ? `Top ${sorted.length - 1} of ${ranked.length} colleges · click chart to view all`
              : `Showing all ${ranked.length} colleges · ${totalVal} students total`}
          </div>
        </CardFooter>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={title}
        subtitle={`Full distribution details — Total count: ${totalVal}`}
        size="lg"
        footer={
          <button className={BTN.primary} onClick={() => setModalOpen(false)}>
            Close
          </button>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
            <span>Ranked list ({ranked.length} items)</span>
            <span className="font-semibold text-gray-700">
              {totalVal} total students
            </span>
          </div>
          <div className="space-y-3.5 py-1">
            {ranked.map((d, index) => {
              const pct = totalVal ? Math.round((d.value / totalVal) * 100) : 0;
              const widthPct = maxValue ? (d.value / maxValue) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-3.5 text-sm">
                  <span className="w-6 font-semibold text-gray-400 tabular-nums shrink-0">
                    #{index + 1}
                  </span>
                  <span
                    className="w-40 font-medium text-gray-700 shrink-0 truncate"
                    title={d.name}
                  >
                    {d.name}
                  </span>
                  <div className="flex-1 bg-gray-100 h-5 rounded-md overflow-hidden relative min-w-[100px]">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: d.color || othersColor,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right font-bold text-gray-900 tabular-nums shrink-0">
                    {d.value}
                  </span>
                  <span className="w-12 text-right text-xs text-gray-400 tabular-nums shrink-0">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Shared interactive area chart (shadcn "Area Chart - Interactive") ────
// Same structure for counselor (appointments vs tests) and admin
// (requests created vs sessions completed): time-range Select (7d/14d),
// gradient areas, legend, totals footer. Colors come from `series`.
function InteractiveAreaCard({
  data = [],
  series = [],
  title,
  subtitle,
  emptyIcon,
  emptyTitle = "No activity yet",
  emptyHint = "New requests will show up here as a daily trend.",
  className = "",
}) {
  const [timeRange, setTimeRange] = React.useState("14d");

  const filteredData = React.useMemo(() => {
    const n = timeRange === "7d" ? 7 : 14;
    return (data || []).slice(-n);
  }, [data, timeRange]);

  const hasData = (data || []).some((d) =>
    series.some((s) => (d[s.key] || 0) > 0)
  );
  if (!data?.length || !series.length || !hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle} · last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
        </CardContent>
      </Card>
    );
  }

  const chartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.name, color: s.color }])
  );

  const totals = filteredData.reduce((acc, d) => {
    const next = { ...acc };
    series.forEach((s) => {
      next[s.key] = (next[s.key] || 0) + (d[s.key] || 0);
    });
    return next;
  }, {});
  const grandTotal = series.reduce((sum, s) => sum + (totals[s.key] || 0), 0);
  const rangeLabel = timeRange === "7d" ? "last 7 days" : "last 14 days";

  return (
    <Card className={`pt-0 ${className}`}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {subtitle} · {rangeLabel}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 14 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="14d" className="rounded-lg">
              Last 14 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`fill-${title}-${s.key}`.replace(/[^a-zA-Z0-9-]/g, "")}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={s.color}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={s.color}
                    stopOpacity={0.06}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tick={{ fontSize: 11, fill: "#6b7280" }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent indicator="dot" config={chartConfig} />
              }
            />
            {series.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="natural"
                name={s.key}
                fill={`url(#fill-${title}-${s.key}`.replace(/[^a-zA-Z0-9-]/g, "") + ")"}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            ))}
            <ChartLegend content={<ChartLegendContent config={chartConfig} />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium text-gray-900">
          {grandTotal} requests in {rangeLabel}
          <TrendingUp className="h-4 w-4 text-maroon-600" />
        </div>
        <div className="leading-none text-gray-500 text-xs">
          {series.map((s) => `${totals[s.key] || 0} ${s.name.toLowerCase()}`).join(" · ")}
        </div>
      </CardFooter>
    </Card>
  );
}

// Counselor: appointments vs. tests (blues, like the reference).
export function RequestVolumeCard(props) {
  return (
    <InteractiveAreaCard
      title="Request volume"
      subtitle="Appointments vs. tests"
      series={[
        { key: "tests", name: "Tests", color: "#60a5ea" },
        { key: "appointments", name: "Appointments", color: "#2563eb" },
      ]}
      {...props}
    />
  );
}

// Admin: requests created vs. sessions completed (blues, like the reference).
export function DemandThroughputCard(props) {
  return (
    <InteractiveAreaCard
      title="Demand vs. throughput"
      subtitle="Requests created vs. sessions completed"
      emptyTitle="No session activity yet"
      emptyHint="Completed sessions will show up here day by day."
      series={[
        { key: "created", name: "Requests created", color: "#60a5ea" },
        { key: "completed", name: "Sessions completed", color: "#2563eb" },
      ]}
      {...props}
    />
  );
}
