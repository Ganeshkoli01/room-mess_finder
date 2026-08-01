import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

export interface TimeSeriesDataPoint {
  day: string;
  count: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  label: string;
  color?: string;
  height?: number;
  daysBack?: number;
  onDaysBackChange?: (days: number) => void;
  chartType?: "area" | "bar";
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  label,
  color = "#10b981", // Emerald/Teal primary accent
  height = 280,
  daysBack = 30,
  onDaysBackChange,
}) => {
  // Format dates cleanly for XAxis display
  const formattedData = data.map((item) => {
    const dateObj = new Date(item.day);
    const formattedDay = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      : item.day;

    return {
      ...item,
      displayDay: formattedDay,
    };
  });

  const totalCount = data.reduce((acc, curr) => acc + Number(curr.count || 0), 0);

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/40 pb-3">
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            {label}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total for selected period: <strong className="text-foreground">{totalCount}</strong>
          </p>
        </div>

        {onDaysBackChange && (
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/30">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysBackChange(d)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
                  daysBack === d
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: "100%", height }}>
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
            <span>No data available for this timeframe</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${label.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="displayDay"
                tick={{ fill: "currentColor", fontSize: 11 }}
                className="text-muted-foreground"
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 11 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="bg-popover/95 backdrop-blur-md border border-border/80 p-2.5 rounded-xl shadow-xl text-xs text-popover-foreground">
                        <p className="font-semibold text-foreground">{dataPoint.day}</p>
                        <p className="text-emerald-500 dark:text-emerald-400 font-medium mt-1">
                          {label}: <span className="font-bold">{dataPoint.count}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#gradient-${label.replace(/\s+/g, "")})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
