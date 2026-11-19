import { AlertCircle, ArrowRight, FileSearch } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatTimestamp, getScoreTier, VerdictIndicator } from '../components/VerdictBadge';
import type { DashboardStats, DashboardSummaryItem, User } from '../types';

interface DashboardPageProps {
  user: User;
  onNavigate: (path: string) => void;
}

export function DashboardPage({ user, onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<DashboardSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.dashboard
      .get()
      .then((res) => {
        if (!active) return;
        setStats(res.stats);
        setRecent(res.recentAnalyses);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load dashboard metrics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const needsReviewCount = (stats?.misleadingCount || 0) + (stats?.unverifiedCount || 0);

  return (
    <div className="space-y-8">
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Welcome back, {user.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor your news verification metrics, review recent verdicts, or start a new claim check.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/analyze')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <FileSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Analyze News</span>
        </button>
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

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-28 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
            >
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-200 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Total News Analyzed</p>
            <p className="mt-2 font-mono text-3xl font-bold text-slate-950 tabular-nums">
              {stats?.totalAnalyzed ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              Avg score: {stats?.averageScore ?? 0}/100
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">True News Count</p>
            <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
              {stats?.trueCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">Corroborated by sources</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">False News Count</p>
            <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums">
              {stats?.falseCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">Contradicted by records</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Misleading / Unverified</p>
            <p className="mt-2 font-mono text-3xl font-bold text-amber-700 tabular-nums">
              {needsReviewCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats?.misleadingCount ?? 0} misleading · {stats?.unverifiedCount ?? 0} unverified
            </p>
          </div>
        </div>
      )}

      {/* Recent Analysis History */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900">Recent Analysis History</h2>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('/history')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-11 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-base font-semibold text-slate-900">
              No analyses recorded yet
            </p>
            <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
              Paste a news article, social claim, or URL to run live Groq AI verification and
              populate your credibility dashboard.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/analyze')}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Analyze Your First Article
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Article / Claim</th>
                  <th className="py-3 px-4 whitespace-nowrap">Analyzed On</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Score</th>
                  <th className="py-3 px-4 whitespace-nowrap">Verdict</th>
                  <th className="py-3 px-6 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {recent.map((item) => {
                  const tier = getScoreTier(item.credibilityScore);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 max-w-md">
                        <p className="font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          <span className="capitalize">{item.inputType}</span> input
                          {item.sourceUrl ? ` · ${item.sourceUrl}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                        {formatTimestamp(item.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-semibold tabular-nums ${tier.textClass}`}>
                          {item.credibilityScore}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <VerdictIndicator verdict={item.verdict} />
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/results/${item.id}`)}
                          className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
