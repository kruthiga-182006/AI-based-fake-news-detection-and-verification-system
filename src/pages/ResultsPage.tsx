import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { AnalysisReportView } from '../components/AnalysisReportView';
import type { AnalysisReport, User } from '../types';

interface ResultsPageProps {
  analysisId: number;
  user?: User | null;
  onNavigate: (path: string) => void;
}

export function ResultsPage({ analysisId, user, onNavigate }: ResultsPageProps) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.analyses
      .getById(analysisId)
      .then((res) => {
        if (active) setReport(res.analysis);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load analysis report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [analysisId]);

  const wrapperClass = user ? 'space-y-6' : 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6';

  if (loading) {
    return (
      <div className={wrapperClass}>
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <div className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={wrapperClass}>
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error || 'Analysis report could not be found.'}</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(user ? '/history' : '/analyze')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{user ? 'Back to Analysis History' : 'Back to Analyze News'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate(user ? '/history' : '/analyze')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{user ? 'Back to History' : 'Back to Analyze News'}</span>
        </button>
      </div>

      <AnalysisReportView
        report={report}
        user={user}
        onNavigate={onNavigate}
        onReset={() => onNavigate('/analyze')}
      />
    </div>
  );
}
