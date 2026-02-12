import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import { money, type Snapshot, type ModelReport } from "./types";

const dateLabel = (value: string) =>
  new Date(value + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export function Sparkline({
  values,
  tone = "teal",
}: {
  values: number[];
  tone?: string;
}) {
  const min = Math.min(...values),
    range = Math.max(...values) - min || 1;
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * 108},${32 - ((v - min) / range) * 25}`,
    )
    .join(" ");
  return (
    <svg
      className={`sparkline ${tone}`}
      viewBox="0 0 110 36"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
export function ExposureChart({ data }: { data: Snapshot }) {
  const [range, setRange] = useState("3M");
  const history = data.history.slice(range === "1M" ? -30 : -90);
  return (
    <section className="panel exposure-chart" aria-label="Exposure history">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">EXPOSURE MONITOR</span>
          <h2>Exposure over time</h2>
        </div>
        <div className="segmented" aria-label="Chart period">
          {["1M", "3M"].map((v) => (
            <button
              key={v}
              aria-pressed={range === v}
              onClick={() => setRange(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-meta">
        <div>
          <b>{money(data.totals.net, 2)}</b>
          <span>Current net exposure</span>
        </div>
        <div className="chart-legend">
          <span>
            <i className="dot teal" />
            Net exposure
          </span>
          <span>
            <i className="dot blue" />
            PFE · 95%
          </span>
          <span>
            <i className="line-key" />
            Limit
          </span>
        </div>
      </div>
      <div className="main-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={history}
            margin={{ top: 15, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.18} />
                <stop
                  offset="100%"
                  stopColor="var(--teal)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              vertical={false}
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="date"
              tickFormatter={dateLabel}
              minTickGap={55}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              dy={10}
            />
            <YAxis
              tickFormatter={(v) => `$${Math.round(v)}M`}
              domain={[0, Math.ceil((data.totals.limit * 1.1) / 100) * 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                borderColor: "var(--border)",
                fontSize: 12,
              }}
              formatter={(v, name) => [
                money(Number(v)),
                name === "net" ? "Net exposure" : "PFE (95%)",
              ]}
              labelFormatter={(v) => dateLabel(String(v))}
            />
            <ReferenceLine
              y={data.totals.limit}
              stroke="var(--muted)"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="pfe"
              stroke="var(--blue)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke="var(--teal)"
              strokeWidth={2.5}
              fill="url(#exposureFill)"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-foot">
        <span>
          <i className="dot teal" />
          {data.counterparties.length} counterparties in scope
        </span>
        <span>Illustrative history · USD millions</span>
      </div>
    </section>
  );
}
export function Concentration({
  data,
  onExplore,
}: {
  data: Snapshot;
  onExplore: () => void;
}) {
  const colors = ["var(--teal)", "var(--blue)", "var(--sage)", "var(--sand)"];
  const sorted = data.concentration.toSorted((a, b) => b.value - a.value);
  return (
    <section className="panel concentration">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PORTFOLIO MIX</span>
          <h2>Exposure by product</h2>
        </div>
      </div>
      <div className="mix-total">
        <b>{money(data.totals.net, 2)}</b>
        <span>Net exposure</span>
      </div>
      <div
        className="composition-bar"
        role="img"
        aria-label="Share of net exposure by product"
      >
        {sorted.map((v, i) => (
          <div
            key={v.name}
            style={{
              width: `${(v.value / data.totals.net) * 100}%`,
              background: colors[i],
            }}
          />
        ))}
      </div>
      <div className="mix-list">
        {sorted.map((v, i) => (
          <div key={v.name}>
            <span>
              <i className="dot" style={{ background: colors[i] }} />
              {v.name}
            </span>
            <strong>
              {((v.value / data.totals.net) * 100).toFixed(1)}
              <small>%</small>
            </strong>
            <div className="mix-track">
              <i
                style={{
                  width: `${(v.value / data.totals.net) * 100}%`,
                  background: colors[i],
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="text-button mix-link" onClick={onExplore}>
        Explore exposures <ArrowUpRight size={16} />
      </button>
    </section>
  );
}
export function RocChart({ data }: { data: ModelReport }) {
  return (
    <div className="roc-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.roc} margin={{ left: 10, right: 20, bottom: 20 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="fpr"
            domain={[0, 1]}
            tick={{ fontSize: 11 }}
            label={{
              value: "False positive rate",
              position: "insideBottom",
              offset: -15,
              fontSize: 11,
            }}
          />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} width={35} />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            stroke="var(--muted)"
            strokeDasharray="4 4"
          />
          <Tooltip formatter={(v) => Number(v).toFixed(3)} />
          <Area
            type="stepAfter"
            dataKey="tpr"
            name="True positive rate"
            stroke="var(--teal)"
            fill="var(--teal-soft)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
