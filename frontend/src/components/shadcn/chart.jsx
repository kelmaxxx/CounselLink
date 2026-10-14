// Minimal shadcn/ui chart primitives (chart.jsx equivalent).
// Same public API as shadcn: ChartContainer, ChartTooltip,
// ChartTooltipContent, ChartLegend, ChartLegendContent.
// No new dependencies — built on recharts + tailwind only,
// and keeps the app's existing gray/green palette.
import React from "react";
import { ResponsiveContainer, Tooltip, Legend } from "recharts";

// shadcn's ChartConfig type: { [key]: { label, color } }
export function ChartContainer({ config = {}, className = "", children, style = {} }) {
  const vars = {};
  Object.entries(config).forEach(([key, value]) => {
    if (value?.color) vars[`--color-${key}`] = value.color;
  });
  return (
    <div
      className={`w-full [&_.recharts-wrapper]:outline-none ${className}`}
      style={{ ...vars, ...style }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export const ChartTooltip = Tooltip;
export const ChartLegend = Legend;

function getPayloadConfig(payload, config) {
  if (!payload) return undefined;
  const key =
    payload?.dataKey ?? payload?.name ?? payload?.payload?.name ?? "";
  return config?.[key] ?? config?.[(key || "").toLowerCase()];
}

export function ChartTooltipContent({
  active,
  payload = [],
  label,
  labelFormatter,
  formatter,
  indicator = "dot",
  config,
  hideLabel = false,
}) {
  if (!active || !payload?.length) return null;

  const title = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg shadow-gray-950/5 text-xs min-w-[140px]">
      {!hideLabel && title != null && title !== "" && (
        <p className="font-semibold text-gray-900 mb-1.5">{title}</p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const itemConfig = getPayloadConfig(item, config);
          const name = itemConfig?.label ?? item.name ?? item.dataKey;
          const color =
            item.color || item.payload?.fill || item.stroke || "#0B6623";
          const rawValue = item.value;
          let display = rawValue;
          if (formatter) {
            const formatted = formatter(rawValue, item.name, item, i, payload);
            display = Array.isArray(formatted) ? formatted[0] : formatted;
          }
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-gray-500 min-w-0">
                {indicator === "dot" ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                ) : (
                  <span
                    className="w-1 h-3.5 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                )}
                <span className="truncate">{name}</span>
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegendContent({ payload = [], config, verticalAlign }) {
  if (!payload?.length) return null;
  return (
    <div
      className={`flex items-center justify-center gap-4 pt-2 text-xs text-gray-500 ${
        verticalAlign === "top" ? "pb-2 pt-0" : ""
      }`}
    >
      {payload.map((item, i) => {
        const itemConfig = getPayloadConfig(item, config);
        const name = itemConfig?.label ?? item.value ?? item.dataKey;
        const color = item.color || "#0B6623";
        return (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: color }}
            />
            {name}
          </span>
        );
      })}
    </div>
  );
}
