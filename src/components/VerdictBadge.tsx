import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { Verdict } from '../types';

export function getScoreTier(score: number): {
  label: string;
  textClass: string;
  barClass: string;
  strokeColor: string;
} {
  if (score >= 80) {
    return {
      label: 'High credibility',
      textClass: 'text-emerald-700',
      barClass: 'bg-emerald-600',
      strokeColor: '#16A34A',
    };
  }
  if (score >= 50) {
    return {
      label: 'Needs further verification',
      textClass: 'text-amber-700',
      barClass: 'bg-amber-500',
      strokeColor: '#D97706',
    };
  }
  return {
    label: 'Low credibility',
    textClass: 'text-red-700',
    barClass: 'bg-red-600',
    strokeColor: '#DC2626',
  };
}

export function getPredictionInfo(verdict: Verdict): {
  prediction: 'REAL NEWS' | 'FAKE NEWS' | 'UNVERIFIED';
  verificationStatus: string;
  containerClass: string;
  textClass: string;
} {
  if (verdict === 'TRUE') {
    return {
      prediction: 'REAL NEWS',
      verificationStatus: 'Verified True — Corroborated by trusted sources',
      containerClass: 'bg-emerald-50 border-emerald-200',
      textClass: 'text-emerald-800',
    };
  }
  if (verdict === 'FALSE') {
    return {
      prediction: 'FAKE NEWS',
      verificationStatus: 'Verified False — Contradicted by reliable evidence',
      containerClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-800',
    };
  }
  if (verdict === 'MISLEADING') {
    return {
      prediction: 'FAKE NEWS',
      verificationStatus: 'Misleading — Distorted or missing crucial context',
      containerClass: 'bg-amber-50 border-amber-200',
      textClass: 'text-amber-900',
    };
  }
  return {
    prediction: 'UNVERIFIED',
    verificationStatus: 'Unverified — Insufficient independent evidence found',
    containerClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-900',
  };
}

export function VerdictIndicator({ verdict }: { verdict: Verdict }) {
  if (verdict === 'TRUE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>TRUE</span>
      </span>
    );
  }

  if (verdict === 'FALSE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
        <XCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
        <span>FALSE</span>
      </span>
    );
  }

  if (verdict === 'MISLEADING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
        <span>MISLEADING</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 whitespace-nowrap shrink-0">
      <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
      <span>UNVERIFIED</span>
    </span>
  );
}

export function formatTimestamp(isoOrSqliteDate: string): string {
  const normalized = isoOrSqliteDate.includes('T')
    ? isoOrSqliteDate
    : `${isoOrSqliteDate.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoOrSqliteDate;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
