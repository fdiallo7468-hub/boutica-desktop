import React, { useState } from 'react';
import { formatMoney } from '../../lib/money.ts';
import type { ChartPoint } from '../../lib/dashboard-analytics.ts';

interface RevenueChartProps {
  data: ChartPoint[];
  currency?: string;
  isLoading?: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  currency = 'XOF',
  isLoading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-xs text-[#706C70] animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-[#9A050E] border-t-transparent animate-spin mb-2" />
        Chargement des tendances de vente...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-xs text-[#706C70] border border-dashed border-[#E5E2E3] rounded-xl">
        Aucune donnée de vente pour cette période
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0);
  const totalPeriodRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalPeriodSales = data.reduce((acc, d) => acc + d.salesCount, 0);

  // SVG dimensions
  const width = 800;
  const height = 220;
  const padLeft = 65;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 35;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Round max value up for nice grid increments
  const ceilMax = maxRevenue > 0 ? Math.ceil(maxRevenue * 1.15) : 1000;
  const yTicks = [0, Math.round(ceilMax / 2), ceilMax];

  // Map data to coordinates
  const points = data.map((d, i) => {
    const x = data.length === 1 ? padLeft + chartW / 2 : padLeft + (i / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.revenue / ceilMax) * chartH;
    return { ...d, x, y };
  });

  // Build SVG path
  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic curve
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = padTop + chartH;
    areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  // Select fewer X-axis labels to avoid crowding
  const labelInterval = data.length > 15 ? 4 : data.length > 7 ? 2 : 1;

  return (
    <div className="w-full select-none">
      {/* Top summary row */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-semibold text-[#706C70]">Chiffre d'affaires cumulé sur la période</div>
          <div className="text-lg font-bold text-[#2B282C] tabular-nums">
            {formatMoney(totalPeriodRevenue, currency)}
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF6EF] text-[#16804A] text-xs font-semibold">
            {totalPeriodSales} transaction{totalPeriodSales > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48 sm:h-56 overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9A050E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#9A050E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y-axis values */}
          {yTicks.map((val, idx) => {
            const yPos = padTop + chartH - (val / ceilMax) * chartH;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="#E5E2E3"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-[#706C70] text-[10px] tabular-nums font-mono"
                >
                  {val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `${Math.round(val / 1000)}k`
                    : val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaD && maxRevenue > 0 && (
            <path d={areaD} fill="url(#revenueGradient)" />
          )}

          {/* Line stroke */}
          {pathD && maxRevenue > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="#9A050E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points & Interactive overlay columns */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            const barW = chartW / points.length;
            const colX = pt.x - barW / 2;

            return (
              <g key={idx}>
                {/* Invisible hover trigger area */}
                <rect
                  x={colX}
                  y={padTop}
                  width={barW}
                  height={chartH + padBottom}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                />

                {/* Point circle */}
                {maxRevenue > 0 && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : pt.revenue > 0 ? 3.5 : 2}
                    className="transition-all duration-100"
                    fill={isHovered ? '#5F0203' : pt.revenue > 0 ? '#9A050E' : '#E5E2E3'}
                    stroke="#FFFFFF"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                  />
                )}

                {/* X-axis label */}
                {(idx % labelInterval === 0 || idx === points.length - 1) && (
                  <text
                    x={pt.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-[#706C70] text-[10px] font-medium"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertical cursor guide line on hover */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + chartH}
              stroke="#9A050E"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-[#2B282C] text-white px-3 py-1.5 shadow-lg text-xs"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: '8px',
            }}
          >
            <div className="font-semibold text-white/90 text-[11px] border-b border-white/20 pb-0.5 mb-1">
              {activePoint.fullDate}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-[#E5E2E3]">Ventes :</span>
              <span className="font-bold text-[#EAF6EF] tabular-nums">
                {formatMoney(activePoint.revenue, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] text-[#A8A4A8]">
              <span>Volume :</span>
              <span>{activePoint.salesCount} ticket{activePoint.salesCount > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
