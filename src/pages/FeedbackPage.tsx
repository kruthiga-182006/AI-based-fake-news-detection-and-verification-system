import { AlertCircle, CheckCircle2, Star } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { formatTimestamp } from '../components/VerdictBadge';
import type { AnalysisReport, FeedbackEntry } from '../types';

interface FeedbackPageProps {
  initialAnalysisId?: number | null;
}

const CATEGORIES = [
  'Verification Accuracy',
  'Source Citations',
  'Bias & Tone Analysis',
  'User Interface',
  'General',
];

export function FeedbackPage({ initialAnalysisId }: FeedbackPageProps) {
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [analysisId, setAnalysisId] = useState<string>(
    initialAnalysisId ? String(initialAnalysisId) : ''
  );
  const [comments, setComments] = useState('');
  const [analyses, setAnalyses] = useState<AnalysisReport[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([api.feedback.list(), api.analyses.list()])
      .then(([fbRes, anRes]) => {
        setFeedbackList(fbRes.feedbackList);
        setAnalyses(anRes.analyses);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load feedback history.');
      })
      .finally(() => setLoadingList(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (comments.trim().length < 5) {
      setError('Please enter at least 5 characters of feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const { feedback } = await api.feedback.submit({
        rating,
        category,
        comments: comments.trim(),
        analysisId: analysisId ? Number(analysisId) : null,
      });
      setFeedbackList((prev) => [feedback, ...prev]);
      setComments('');
      setSuccess('Thank you! Your feedback has been saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Feedback Form */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-950">Submit Feedback</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Rate verification accuracy, evidence clarity, or suggest improvements to TruthGuard AI.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="block text-sm font-semibold text-slate-900 mb-2">Rating</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`Rate ${value} out of 5 stars`}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    value <= rating
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${value <= rating ? 'fill-blue-600 text-blue-600' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-mono font-semibold text-slate-700 tabular-nums">
                {rating}/5
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="fb-category" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Feedback Category
            </label>
            <select
              id="fb-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fb-analysis" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Related Analysis <span className="font-normal text-slate-500">(Optional)</span>
            </label>
            <select
              id="fb-analysis"
              value={analysisId}
              onChange={(e) => setAnalysisId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">General platform feedback</option>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} — {a.title.slice(0, 60)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fb-comments" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Comments
            </label>
            <textarea
              id="fb-comments"
              rows={5}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Share details on how accurate the verdict, explanation, or source references were..."
              className="w-full p-3.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* Previous Feedback Submissions */}
      <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-lg font-bold text-slate-900">Your Previous Feedback</h2>

        {loadingList ? (
          <div className="space-y-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-20 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : feedbackList.length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven&apos;t submitted any feedback yet. Use the form to share your evaluation.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {feedbackList.map((entry) => (
              <div key={entry.id} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">
                    {entry.category} ·{' '}
                    <span className="font-mono text-blue-700 tabular-nums">{entry.rating}/5 ★</span>
                  </span>
                  <span className="font-mono tabular-nums">{formatTimestamp(entry.createdAt)}</span>
                </div>
                {entry.analysisTitle && (
                  <p className="text-xs text-blue-700 truncate">
                    Analysis: {entry.analysisTitle}
                  </p>
                )}
                <p className="text-sm text-slate-700 leading-relaxed">{entry.comments}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
