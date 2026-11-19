import { AlertCircle, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatTimestamp, getScoreTier, VerdictIndicator } from '../components/VerdictBadge';
import type { AnalysisReport } from '../types';

interface HistoryPageProps {
  onNavigate: (path: string) => void;
}

const FILTERS = [
  { value: 'ALL', label: 'All Verdicts' },
  { value: 'TRUE', label: 'True' },
  { value: 'FALSE', label: 'False' },
  { value: 'MISLEADING', label: 'Misleading' },
  { value: 'UNVERIFIED', label: 'Unverified' },
];

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const [analyses, setAnalyses] = useState<AnalysisReport[]>([]);
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAnalyses = (verdict: string, q: string) => {
    setLoading(true);
    setError('');
    api.analyses
      .list({ verdict, q })
      .then((res) => setAnalyses(res.analyses))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to fetch analysis history.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalyses(verdictFilter, searchTerm);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [verdictFilter, searchTerm]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError('');
    try {
      await api.analyses.remove(id);
      setAnalyses((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete analysis record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Analysis History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse previously verified news articles, compare scores, and open full evidence reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/analyze')}
          className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Analyze News
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setVerdictFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                verdictFilter === f.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved headlines or URLs..."
            aria-label="Search analysis history"
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* History List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-14 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-base font-semibold text-slate-900">
              No matching analysis records
            </p>
            <p className="mt-1.5 text-sm text-slate-600">
              {searchTerm || verdictFilter !== 'ALL'
                ? 'Try clearing your search term or selecting another verdict filter.'
                : 'Your saved news verification reports will appear here after your first analysis.'}
            </p>
            {!searchTerm && verdictFilter === 'ALL' && (
              <button
                type="button"
                onClick={() => onNavigate('/analyze')}
                className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
              >
                Start Verification
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">News Headline / Excerpt</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date &amp; Time</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Credibility</th>
                  <th className="py-3 px-4 whitespace-nowrap">Verdict</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {analyses.map((item) => {
                  const tier = getScoreTier(item.credibilityScore);
                  const isConfirming = confirmDeleteId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 max-w-md">
                        <p className="font-semibold text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {item.cleanedContent}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {formatTimestamp(item.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-semibold tabular-nums ${tier.textClass}`}>
                          {item.credibilityScore}/100
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <VerdictIndicator verdict={item.verdict} />
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => void handleDelete(item.id)}
                              className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => onNavigate(`/results/${item.id}`)}
                              className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Delete ${item.title}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
