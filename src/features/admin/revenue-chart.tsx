"use client";

import { useId, useMemo, useState } from "react";

export type RevenuePoint = { date: string; cumulative: number };

const W = 820;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 34, left: 64 };

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Cumulative revenue over the last N days — a single-series area chart.
 * One series, so the title names it and no legend is needed.
 */
export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const plot = {
    x0: PAD.left,
    x1: W - PAD.right,
    y0: H - PAD.bottom,
    y1: PAD.top,
  };
  const innerW = plot.x1 - plot.x0;
  const innerH = plot.y0 - plot.y1;

  const maxY = useMemo(
    () => niceCeil(Math.max(1, ...data.map((d) => d.cumulative))),
    [data],
  );

  const xFor = (i: number) =>
    data.length <= 1 ? plot.x0 : plot.x0 + (i / (data.length - 1)) * innerW;
  const yFor = (v: number) => plot.y0 - (v / maxY) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.cumulative)}`).join(" ");
  const areaPath =
    data.length > 0
      ? `${linePath} L${xFor(data.length - 1)},${plot.y0} L${plot.x0},${plot.y0} Z`
      : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const xTickIdx =
    data.length <= 1
      ? [0]
      : [0, Math.round((data.length - 1) / 2), data.length - 1];

  const hasData = data.some((d) => d.cumulative > 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-bold">Cumulative revenue</h2>
        <span className="text-muted-foreground text-xs">Last {data.length} days</span>
      </div>

      {!hasData ? (
        <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
          No revenue in this period yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full"
          role="img"
          aria-label={`Cumulative revenue over the last ${data.length} days, ending at ${formatRupees(
            data.at(-1)?.cumulative ?? 0,
          )}`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={plot.x0}
                x2={plot.x1}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={plot.x0 - 10}
                y={yFor(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={11}
              >
                {formatRupees(t)}
              </text>
            </g>
          ))}

          {xTickIdx.map((i) => (
            <text
              key={i}
              x={xFor(i)}
              y={plot.y0 + 20}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground"
              fontSize={11}
            >
              {data[i]?.date}
            </text>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hover !== null && data[hover] && (
            <g>
              <line
                x1={xFor(hover)}
                x2={xFor(hover)}
                y1={plot.y1}
                y2={plot.y0}
                stroke="var(--primary)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={xFor(hover)}
                cy={yFor(data[hover].cumulative)}
                r={4}
                fill="var(--primary)"
                stroke="var(--card)"
                strokeWidth={2}
              />
              <g
                transform={`translate(${Math.min(
                  Math.max(xFor(hover), plot.x0 + 60),
                  plot.x1 - 60,
                )}, ${plot.y1 + 6})`}
              >
                <rect x={-58} y={-2} width={116} height={40} rx={6} fill="var(--popover)" stroke="var(--border)" />
                <text x={0} y={13} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                  {data[hover].date}
                </text>
                <text x={0} y={29} textAnchor="middle" className="fill-foreground" fontSize={12} fontWeight={600}>
                  {formatRupees(data[hover].cumulative)}
                </text>
              </g>
            </g>
          )}

          {data.map((_, i) => (
            <rect
              key={i}
              x={xFor(i) - innerW / (2 * Math.max(1, data.length - 1))}
              y={plot.y1}
              width={innerW / Math.max(1, data.length - 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
