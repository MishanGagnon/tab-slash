"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ClaimedProgressBarProps {
  claimedAmountCents: number;
  totalAmountCents: number;
  label?: string;
  showAmounts?: boolean;
  minBarWidth?: number;
}

export function ClaimedProgressBar({
  claimedAmountCents,
  totalAmountCents,
  label = "CLAIMED",
  showAmounts = true,
  minBarWidth = 10,
}: ClaimedProgressBarProps) {
  const percentage =
    totalAmountCents > 0
      ? Math.min(100, Math.max(0, (claimedAmountCents / totalAmountCents) * 100))
      : 0;

  const getColor = (percent: number): string => {
    if (percent <= 50) {
      const ratio = percent / 50;
      const r = Math.round(220 + (234 - 220) * ratio);
      const g = Math.round(38 + (179 - 38) * ratio);
      const b = Math.round(38 + (8 - 38) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = (percent - 50) / 50;
      const r = Math.round(234 + (34 - 234) * ratio);
      const g = Math.round(179 + (197 - 179) * ratio);
      const b = Math.round(8 + (94 - 8) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const barColor = getColor(percentage);

  // --- auto bar width ---
  const barWrapRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [barWidth, setBarWidth] = useState(20);

  useEffect(() => {
    const wrap = barWrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const compute = () => {
      const wrapPx = wrap.getBoundingClientRect().width;

      // Measure the width of a single monospace char using a known string
      const sample = "--------------------"; // 20 chars
      measure.textContent = sample;
      const samplePx = measure.getBoundingClientRect().width;
      const charPx = samplePx / sample.length || 8;

      // We render: "[" + (barWidth chars) + "]" => brackets cost ~2 chars
      const next = Math.max(minBarWidth, Math.floor(wrapPx / charPx) - 2);
      setBarWidth(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [minBarWidth]);

  const { filledBar, emptyBar } = useMemo(() => {
    const filledBlocks = Math.round((percentage / 100) * barWidth);
    const emptyBlocks = Math.max(0, barWidth - filledBlocks);
    return {
      filledBar: "=".repeat(filledBlocks),
      emptyBar: "-".repeat(emptyBlocks),
    };
  }, [percentage, barWidth]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
          {label}
        </p>
      )}

      <div className="flex items-center text-[10px] uppercase font-mono w-full">
        <span className="opacity-60 flex-shrink-0 whitespace-nowrap mr-2">
          progress
        </span>

        {/* This area will stretch; barWidth is computed from its pixel width */}
        <div
          ref={barWrapRef}
          className="flex-1 min-w-0 flex items-center"
          style={{ color: barColor }}
        >
          <span
            className="font-mono block w-full text-left whitespace-nowrap"
            style={{ letterSpacing: "0.2em" }}
          >
            [{filledBar}
            {emptyBar}]
          </span>

          {/* hidden measurer */}
          <span
            ref={measureRef}
            className="absolute -left-[9999px] top-0 font-mono text-[10px] uppercase"
            style={{ letterSpacing: "0.2em" }}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="font-bold whitespace-nowrap" style={{ color: barColor }}>
            {Math.round(percentage)}%
          </span>
          {showAmounts && (
            <>
              <span className="opacity-50">|</span>
              <span className="opacity-60 text-right whitespace-nowrap">
                {formatCurrency(claimedAmountCents)} / {formatCurrency(totalAmountCents)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
