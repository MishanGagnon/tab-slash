"use client";

interface ClaimedProgressBarProps {
  claimedAmountCents: number;
  totalAmountCents: number;
  label?: string;
  showAmounts?: boolean;
  currency?: string;
}

export function ClaimedProgressBar({
  claimedAmountCents,
  totalAmountCents,
  label,
  showAmounts = true,
  currency = "USD",
}: ClaimedProgressBarProps) {
  const percentage =
    totalAmountCents > 0
      ? Math.min(100, Math.max(0, (claimedAmountCents / totalAmountCents) * 100))
      : 0;

  const getColor = (percent: number): string => {
    // Red -> Yellow -> Green gradient
    // Using standard Tailwind-ish colors that fit the receipt theme
    if (percent <= 50) {
      const ratio = percent / 50;
      // Interpolate between #ef4444 (red-500) and #eab308 (yellow-500)
      const r = Math.round(239 + (234 - 239) * ratio);
      const g = Math.round(68 + (179 - 68) * ratio);
      const b = Math.round(68 + (8 - 68) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const ratio = (percent - 50) / 50;
      // Interpolate between #eab308 (yellow-500) and #22c55e (green-500)
      const r = Math.round(234 + (34 - 234) * ratio);
      const g = Math.round(179 + (197 - 179) * ratio);
      const b = Math.round(8 + (94 - 8) * ratio);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const formatCurrency = (cents: number) => {
    const amount = (cents / 100).toFixed(2);
    const curr = currency || "USD";

    if (curr === "USD") return `$${amount}`;
    if (curr === "EUR") return `€${amount}`;
    if (curr === "GBP") return `£${amount}`;
    if (curr === "CAD") return `C$${amount}`;
    if (curr === "AUD") return `A$${amount}`;
    if (curr === "INR") return `₹${amount}`;

    return `${amount} ${curr}`;
  };
  const barColor = getColor(percentage);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          {label && (
            <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">
              {label}
            </p>
          )}
          <h3 className="text-[10px] font-bold uppercase tracking-widest leading-none">
            Amount Claimed
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <span 
            className="text-sm font-black font-mono leading-none" 
            style={{ color: barColor }}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      <div className="relative h-1.5 w-full bg-ink/[0.03] border border-ink overflow-hidden shadow-[1px_1px_0px_rgba(0,0,0,0.1)]">
        {/* The progress fill */}
        <div
          className="h-full transition-all duration-1000 ease-out relative border-r border-ink/20"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {showAmounts && (
        <div className="flex justify-between items-start pt-0.5">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold opacity-30 tracking-tighter">Claimed</span>
            <span className="text-xs font-mono font-black" style={{ color: percentage > 0 ? barColor : undefined }}>
              {formatCurrency(claimedAmountCents)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase font-bold opacity-30 tracking-tighter">Remaining</span>
            <span className="text-xs font-mono font-bold opacity-60">
              {formatCurrency(Math.max(0, totalAmountCents - claimedAmountCents))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
