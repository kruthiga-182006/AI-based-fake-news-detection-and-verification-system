import { AlertCircle, Eraser, FileText, Globe, Loader2, SearchCheck, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import { AnalysisReportView } from '../components/AnalysisReportView';
import type { AnalysisReport, User } from '../types';

interface AnalyzePageProps {
  user?: User | null;
  onNavigate?: (path: string) => void;
}

const SAMPLE_CLAIMS = [
  {
    label: 'WHO Public Health (Real News)',
    content:
      'The World Health Organization recommends that adults get at least 150 to 300 minutes of moderate-intensity aerobic physical activity per week to reduce the risk of cardiovascular disease and type 2 diabetes.',
    url: '',
  },
  {
    label: 'Miracle Cure Hoax (Fake News)',
    content:
      'BREAKING BOMBSHELL: Scientists secretly confirmed that drinking boiled lemon water with baking soda cures all forms of cancer within 48 hours, and hospitals are hiding this 100% proven miracle cure from the public!',
    url: '',
  },
  {
    label: 'NASA Climate Record (Real News)',
    content:
      'According to NASA and NOAA global temperature records, 2023 was the warmest year on record since modern global recordkeeping began in 1880.',
    url: '',
  },
];

const PIPELINE_STEPS = [
  'Cleaning and preprocessing news text...',
  'Extracting factual claims and linguistic tone cues...',
  'Running Groq browser_search across trusted web sources...',
  'Scoring evidence consistency with openai/gpt-oss-20b...',
];

export function AnalyzePage({ user, onNavigate }: AnalyzePageProps) {
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const outputSectionRef = useRef<HTMLDivElement | null>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const scrollToOutput = () => {
    window.setTimeout(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleClear = () => {
    setContent('');
    setUrl('');
    setUploadedFileName('');
    setError('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('Uploaded file is too large. Please select a text file under 2 MB.');
      e.target.value = '';
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isTextLike =
      file.type.startsWith('text/') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm');

    if (!isTextLike) {
      setError(
        `Unsupported file format (${file.name}). Please upload a .txt, .md, .csv, .json, or .html news file, or paste the article text directly.`
      );
      e.target.value = '';
      return;
    }

    try {
      const rawFileText = await file.text();
      const cleaned = rawFileText
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+\n/g, '\n')
        .trim();

      if (!cleaned) {
        setError(`The uploaded file "${file.name}" did not contain readable text.`);
        return;
      }

      setContent(cleaned.slice(0, 20000));
      setUploadedFileName(file.name);
    } catch {
      setError(`Could not read "${file.name}". Please paste the article text directly.`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedContent = content.trim();
    const trimmedUrl = url.trim();

    if (!trimmedContent && !trimmedUrl) {
      setError('Please paste news text, upload a news file, or enter a news article URL.');
      scrollToOutput();
      return;
    }

    setLoading(true);
    setResult(null);
    setStepIdx(0);
    scrollToOutput();

    const interval = window.setInterval(() => {
      setStepIdx((prev) => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 2200);

    try {
      const response = await api.analyses.analyze({
        content: trimmedContent,
        url: trimmedUrl,
      });

      if (!response || !response.analysis) {
        throw new Error('Server returned an empty analysis response. Please try again.');
      }

      setResult(response.analysis);
      scrollToOutput();
    } catch (err) {
      console.error('News analysis failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Verification failed. Please check your input or API configuration and try again.'
      );
      scrollToOutput();
    } finally {
      window.clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div
      className={
        user
          ? 'max-w-5xl space-y-8'
          : 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8'
      }
    >
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
          Analyze News &amp; Verify Claims
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          Paste a news article, upload a text file, or provide an article URL. TruthGuard AI
          evaluates whether it is REAL NEWS, FAKE NEWS, or UNVERIFIED, calculates a confidence
          score, and explains the verification result.
        </p>
      </div>

      {/* Quick Test Prompts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-1">Load sample news:</span>
        {SAMPLE_CLAIMS.map((sample) => (
          <button
            key={sample.label}
            type="button"
            disabled={loading}
            onClick={() => {
              setContent(sample.content);
              setUrl(sample.url);
              setUploadedFileName('');
              setError('');
              setResult(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <label htmlFor="news-content" className="block text-sm font-semibold text-slate-900">
              News Content or Claim Text
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="news-file-upload"
                type="file"
                accept=".txt,.md,.csv,.json,.html,.htm,text/*"
                onChange={(e) => void handleFileUpload(e)}
                disabled={loading}
                className="sr-only"
              />
              <label
                htmlFor="news-file-upload"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap ${
                  loading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Upload File</span>
              </label>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {wordCount} words · {content.length}/20,000 chars
              </span>
            </div>
          </div>

          {uploadedFileName && (
            <div className="mb-2 flex items-center gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Loaded file: {uploadedFileName}</span>
            </div>
          )}

          <textarea
            id="news-content"
            rows={8}
            value={content}
            disabled={loading}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the full news article, claim, or viral post here—or click Upload File above..."
            className="w-full p-4 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 leading-relaxed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="news-url" className="block text-sm font-semibold text-slate-900 mb-2">
            News Article URL <span className="font-normal text-slate-500">(Optional)</span>
          </label>
          <div className="relative">
            <Globe
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="news-url"
              type="url"
              value={url}
              disabled={loading}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.reuters.com/world/..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-50"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            When a URL is provided, TruthGuard AI inspects the article and verifies claims with Groq
            browser search.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-500 max-w-md">
            Claims without verifiable public evidence are marked UNVERIFIED. Sources are never
            fabricated.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || (!content && !url && !result && !error)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eraser className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Clear</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <SearchCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{loading ? 'Analyzing...' : 'Analyze News'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Output Region: Loading, Error, or Immediate Analysis Result */}
      <div ref={outputSectionRef} className="space-y-6">
        {loading && (
          <div
            aria-live="polite"
            className="p-5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-4"
          >
            <Loader2 className="w-6 h-6 text-blue-700 animate-spin shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-blue-950">
                Analyzing News &amp; Checking Trusted Sources...
              </p>
              <p className="text-xs text-blue-800 mt-0.5">{PIPELINE_STEPS[stepIdx]}</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="p-5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-900"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-red-950">Analysis Could Not Be Completed</p>
              <p className="leading-relaxed">{error}</p>
              {error.toLowerCase().includes('rate limit') && (
                <p className="text-xs text-red-800 pt-1">
                  Groq Free Plan enforces per-minute request and token limits. Wait a few seconds
                  before submitting again.
                </p>
              )}
            </div>
          </div>
        )}

        {result && !loading && (
          <AnalysisReportView
            report={result}
            user={user}
            onNavigate={onNavigate}
            onReset={handleClear}
          />
        )}
      </div>
    </div>
  );
}
