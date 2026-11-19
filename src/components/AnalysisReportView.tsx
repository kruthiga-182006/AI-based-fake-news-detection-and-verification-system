import {
  CheckCircle2,
  ExternalLink,
  Info,
  MessageSquarePlus,
  XCircle,
} from 'lucide-react';
import type { AnalysisReport, User } from '../types';
import { CredibilityGauge } from './CredibilityGauge';
import { formatTimestamp, getPredictionInfo, VerdictIndicator } from './VerdictBadge';

interface AnalysisReportViewProps {
  report: AnalysisReport;
  user?: User | null;
  onNavigate?: (path: string) => void;
  onReset?: () => void;
}

export function AnalysisReportView({
  report,
  user,
  onNavigate,
  onReset,
}: AnalysisReportViewProps) {
  const verdict = report.verdict || 'UNVERIFIED';
  const score = typeof report.credibilityScore === 'number' ? report.credibilityScore : 0;
  const predictionInfo = getPredictionInfo(verdict);

  const keyTakeaways = Array.isArray(report.keyTakeaways) ? report.keyTakeaways : [];
  const extractedClaims = Array.isArray(report.extractedClaims) ? report.extractedClaims : [];
  const supportingEvidence = Array.isArray(report.supportingEvidence)
    ? report.supportingEvidence
    : [];
  const contradictingEvidence = Array.isArray(report.contradictingEvidence)
    ? report.contradictingEvidence
    : [];
  const trustedSources = Array.isArray(report.trustedSources) ? report.trustedSources : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  const bias = report.biasDetection || {
    politicalOrFramingLean: 'Indeterminate',
    emotionalLanguageLevel: 'Moderate',
    sensationalIndicators: [],
    objectivityAssessment: 'No bias assessment available.',
  };
  const sensationalIndicators = Array.isArray(bias.sensationalIndicators)
    ? bias.sensationalIndicators
    : [];

  return (
    <div className="space-y-8">
      {/* Primary Summary: Prediction, Confidence Score, Explanation, Verification Result */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono tabular-nums">
                {report.createdAt ? formatTimestamp(report.createdAt) : 'Just now'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{report.inputType || 'text'} submission</span>
              {typeof report.nlpSignals?.wordCount === 'number' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{report.nlpSignals.wordCount} words</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                {report.groundingUsed
                  ? 'Live Browser Search Active'
                  : 'Limited Search Corroboration'}
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight [text-wrap:balance]">
              {report.title || 'News Verification Report'}
            </h2>

            {report.sourceUrl && (
              <p className="text-sm text-slate-600 break-all">
                Submitted URL:{' '}
                <a
                  href={report.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>{report.sourceUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </a>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(`/feedback?analysisId=${report.id}`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
                <span>Rate Analysis</span>
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Analyze Another
              </button>
            )}
          </div>
        </div>

        {/* 4 Core Requested Output Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${predictionInfo.containerClass}`}>
              <p className="text-xs font-medium text-slate-600">Classification &amp; Prediction</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <VerdictIndicator verdict={verdict} />
                <span className="text-slate-300" aria-hidden="true">|</span>
                <span className={`font-display text-xl font-bold ${predictionInfo.textClass}`}>
                  {predictionInfo.prediction}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-xs font-medium text-slate-600">Credibility &amp; Confidence Score</p>
              <p className="mt-1.5 font-mono text-2xl font-bold text-slate-950 tabular-nums">
                {score}%{' '}
                <span className="text-sm font-sans font-medium text-slate-500">
                  ({score}/100)
                </span>
              </p>
            </div>

            <div className="sm:col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <p className="text-xs font-medium text-slate-600">Verification Result</p>
              <p className="text-sm font-medium text-slate-800">{predictionInfo.verificationStatus}</p>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-l lg:border-slate-200 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-3">Credibility &amp; Confidence</p>
            <CredibilityGauge score={score} />
          </div>
        </div>

        {/* 3. Explanation */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <h3 className="font-display text-lg font-bold text-slate-900">3. Explanation</h3>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {report.explanation || 'No explanation provided.'}
          </p>
        </div>
      </section>

      {/* AI vs Verified Facts Transparency Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 sm:p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-blue-950 leading-relaxed">
          <span className="font-semibold">Verification Transparency:</span> Linguistic patterns,
          bias indicators, and summaries below are generated by Groq AI (openai/gpt-oss-20b),
          whereas external citations and supporting or contradicting links come strictly from live
          Groq browser search. AI analysis alone does not guarantee authenticity—always review
          primary sources.
        </p>
      </div>

      {/* AI Summary & Bias Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">AI Analysis Summary</h3>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {report.aiAnalysisSummary || 'No summary available.'}
            </p>
          </div>

          {keyTakeaways.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-display text-base font-bold text-slate-900">Key Takeaways</h4>
              <ul className="mt-2.5 space-y-2 text-sm text-slate-700 list-disc pl-5">
                {keyTakeaways.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extractedClaims.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-display text-base font-bold text-slate-900">
                Extracted Claims Audited
              </h4>
              <ol className="mt-2.5 space-y-2 text-sm text-slate-700 list-decimal pl-5">
                {extractedClaims.map((claim, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {claim}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">Bias Detection</h3>

          <dl className="space-y-3 text-sm divide-y divide-slate-100">
            <div className="pt-1 flex justify-between gap-4">
              <dt className="text-slate-500">Framing / Lean</dt>
              <dd className="font-semibold text-slate-900 text-right">
                {bias.politicalOrFramingLean || 'Indeterminate'}
              </dd>
            </div>
            <div className="pt-3 flex justify-between gap-4">
              <dt className="text-slate-500">Emotional Language</dt>
              <dd className="font-semibold text-slate-900 text-right">
                {bias.emotionalLanguageLevel || 'Moderate'}
              </dd>
            </div>
            <div className="pt-3">
              <dt className="text-slate-500 mb-1.5">Objectivity Assessment</dt>
              <dd className="text-slate-700 leading-relaxed">
                {bias.objectivityAssessment || 'No objectivity assessment available.'}
              </dd>
            </div>
            <div className="pt-3">
              <dt className="text-slate-500 mb-1.5">Sensational / Framing Cues</dt>
              <dd className="text-slate-700">
                {sensationalIndicators.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {sensationalIndicators.map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">No strong sensationalist cues detected.</span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Supporting & Contradicting Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-slate-900">Supporting Evidence</h3>
          </div>

          {supportingEvidence.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              No independent supporting evidence was retrieved for these claims during search
              grounding.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {supportingEvidence.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{item.claim}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="font-medium text-slate-700">{item.sourceName}</span>
                    {item.sourceUrl && (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Verify Source</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-slate-900">
              Contradicting Evidence
            </h3>
          </div>

          {contradictingEvidence.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              No contradicting evidence or authoritative refutations were identified in retrieved
              sources.
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {contradictingEvidence.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{item.claim}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="font-medium text-slate-700">{item.sourceName}</span>
                    {item.sourceUrl && (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Verify Source</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Trusted Sources & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">
            Trusted Sources &amp; References
          </h3>

          {trustedSources.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              No external web sources were returned for this query. Treat uncorroborated claims with
              caution and check official primary records directly.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {trustedSources.map((src, idx) => (
                <li key={idx} className="py-3 first:pt-0 last:pb-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-700 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  </a>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {src.sourceType}
                    {src.relevanceNote ? ` · ${src.relevanceNote}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-lg font-bold text-slate-900">Recommendations</h3>
          {recommendations.length > 0 ? (
            <ul className="space-y-2.5 text-sm text-slate-700 list-disc pl-5">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Cross-check primary datasets and official announcements before sharing.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
