import { getScoreTier } from './VerdictBadge';

export function CredibilityGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier = getScoreTier(clamped);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 132 132" aria-hidden="true">
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="10"
          />
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={tier.strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {clamped}
          </span>
          <span className="text-xs text-slate-500 font-medium tabular-nums">out of 100</span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-semibold ${tier.textClass}`}>{tier.label}</p>
    </div>
  );
}
