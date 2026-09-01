"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/primitives";
import { formatNumber } from "@/lib/utils";
import type { TimeSeriesPoint } from "@/lib/types";

const AXIS = { stroke: "#3b4152", fontSize: 11 };
const GRID = "rgba(103,232,249,0.08)";
const CYAN = "#22d3ee";
const VIOLET = "#8b5cf6";
const MAGENTA = "#d946ef";
const SERIES = [CYAN, VIOLET, MAGENTA, "#67e8f9", "#a78bfa", "#f0abfc"];

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-slate-300">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums text-slate-400">
          <span style={{ color: p.color }}>●</span> {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  height = 260,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="p-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AreaSeriesChart({
  data,
  color = CYAN,
}: {
  data: TimeSeriesPoint[];
  color?: string;
}) {
  const id = `grad-${color.replace("#", "")}`;
  return (
    <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
      <Tooltip content={<TooltipBox />} />
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        fill={`url(#${id})`}
        isAnimationActive
        animationDuration={700}
      />
    </AreaChart>
  );
}

export function LineSeriesChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
      <Tooltip content={<TooltipBox />} />
      <Line
        type="monotone"
        dataKey="value"
        stroke={VIOLET}
        strokeWidth={2}
        dot={false}
        isAnimationActive
        animationDuration={700}
      />
    </LineChart>
  );
}

export function BarSeriesChart({
  data,
  horizontal = false,
}: {
  data: { label: string; value: number }[];
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={650}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    );
  }
  return (
    <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
      <CartesianGrid stroke={GRID} vertical={false} />
      <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
      <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={650}>
        {data.map((_, i) => (
          <Cell key={i} fill={SERIES[i % SERIES.length]} />
        ))}
      </Bar>
    </BarChart>
  );
}
