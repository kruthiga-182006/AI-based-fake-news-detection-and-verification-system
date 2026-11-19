import { ArrowRight, BookOpenCheck, Scale, SearchCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { User } from '../types';

interface HomePageProps {
  user: User | null;
  onNavigate: (path: string) => void;
}

export function HomePage({ user, onNavigate }: HomePageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [aboutImgFailed, setAboutImgFailed] = useState(false);

  return (
    <div className="bg-white">
      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold text-blue-700 tracking-tight mb-3">
              AI-Powered News Verification &amp; Evidence Grounding
            </p>
            <h1
              className="font-display font-bold tracking-tight text-slate-950 leading-[1.1] [text-wrap:balance]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
            >
              Verify news claims with transparent evidence, not guesswork.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              TruthGuard AI combines natural language processing, Groq AI reasoning, and live
              browser search to cross-check articles against official records, wire services, and
              independent fact-checking organizations.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/analyze')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Start Analysis</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center px-5 py-3 text-sm sm:text-base font-semibold text-blue-900 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                Explore Methodology
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[280px] lg:min-h-[420px]">
              {heroImgFailed ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-slate-100 text-center">
                  <SearchCheck className="w-12 h-12 text-blue-700 mb-3" aria-hidden="true" />
                  <p className="font-display font-semibold text-slate-900">
                    Investigative Verification Desk
                  </p>
                  <p className="text-sm text-slate-600 mt-1 max-w-sm">
                    Cross-referencing submitted news against authoritative sources and public records.
                  </p>
                </div>
              ) : (
                <img
                  src="/src/assets/images/hero_verification_desk_1794995227430.jpg"
                  alt="Journalist verifying news reports and analytical charts at an investigative newsroom desk"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* 4-Column Full-Width Verification Pipeline Strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/70">
          <div className="p-6">
            <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums">01.</p>
            <h2 className="mt-2 font-display text-base font-semibold text-slate-900">
              NLP Preprocessing
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Cleans submitted articles or URLs, isolates verifiable claims, and measures emotional
              framing cues.
            </p>
          </div>
          <div className="p-6">
            <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums">02.</p>
            <h2 className="mt-2 font-display text-base font-semibold text-slate-900">
              Live Search Grounding
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Queries authoritative newsrooms, official records, and fact-checkers without
              inventing citations.
            </p>
          </div>
          <div className="p-6">
            <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums">03.</p>
            <h2 className="mt-2 font-display text-base font-semibold text-slate-900">
              Supporting &amp; Contradicting Proof
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Separates corroborating evidence from contradicting findings with clickable source
              URLs.
            </p>
          </div>
          <div className="p-6">
            <p className="font-mono text-xs font-semibold text-blue-700 tabular-nums">04.</p>
            <h2 className="mt-2 font-display text-base font-semibold text-slate-900">
              Calibrated Verdict &amp; Score
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Assigns a 0–100 credibility score and returns UNVERIFIED whenever reliable evidence
              is missing.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="border-t border-slate-200 bg-slate-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white aspect-[4/3]">
              {aboutImgFailed ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-blue-50 text-center">
                  <BookOpenCheck className="w-10 h-10 text-blue-700 mb-3" aria-hidden="true" />
                  <p className="font-display font-semibold text-slate-900">
                    Primary Source Verification
                  </p>
                </div>
              ) : (
                <img
                  src="/src/assets/images/evidence_source_archive_1794995233852.jpg"
                  alt="Public policy records, research journals, and an optical prism representing source verification"
                  referrerPolicy="no-referrer"
                  onError={() => setAboutImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-sm font-semibold text-blue-700 mb-2">About TruthGuard AI</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance]">
              Built to separate writing polish from factual accuracy.
            </h2>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Polished prose can still contain fabricated statistics, while urgent breaking reports
              may lack immediate confirmation. TruthGuard AI never determines authenticity from
              writing style alone. Every report clearly separates AI linguistic observations from
              externally retrieved evidence.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums">80–100</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">High Credibility</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Strong corroboration across independent authoritative sources.
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-amber-700 tabular-nums">50–79</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Needs Verification</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Mixed context, incomplete records, or emerging unconfirmed claims.
                </p>
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-red-700 tabular-nums">0–49</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Low Credibility</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Contradicted by public records or known misinformation debunks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Section */}
      <section id="features" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-blue-700 mb-2">Platform Capabilities</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 [text-wrap:balance]">
              Everything needed to audit claims, bias, and source reliability.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 border border-slate-200 rounded-xl p-7 bg-white">
              <div className="flex items-center gap-3 text-blue-700 mb-4">
                <SearchCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">Live Grounded Fact Verification</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Paste news text or submit a direct article URL
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                TruthGuard AI cleans raw article text, inspects submitted URLs, extracts testable
                claims, and runs live Groq browser search to retrieve real supporting and
                contradicting references from government portals, research publications, and major
                fact-checking organizations.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-7 bg-blue-950 text-white">
              <div className="flex items-center gap-3 text-blue-300 mb-4">
                <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">Honest Uncertainty</span>
              </div>
              <h3 className="font-display text-xl font-bold">
                Explicit UNVERIFIED verdicts
              </h3>
              <p className="mt-2.5 text-sm text-blue-100/90 leading-relaxed">
                When independent evidence cannot confirm or refute a claim, TruthGuard AI refuses to
                guess and marks the report UNVERIFIED instead of inventing sources.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl p-7 bg-white">
              <div className="flex items-center gap-3 text-blue-700 mb-4">
                <Scale className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">Bias &amp; Tone Detection</span>
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                Emotional framing diagnostics
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Flags loaded language, sensationalist headlines, excessive capitalization, and
                framing lean alongside an objectivity assessment.
              </p>
            </div>

            <div className="md:col-span-2 border border-slate-200 rounded-xl p-7 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Personal Dashboard &amp; Audit History
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 max-w-xl leading-relaxed">
                  Track every verified article in your personal SQLite-backed history, review past
                  credibility scores, inspect clickable references, and submit evaluation feedback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(user ? '/dashboard' : '/register')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {user ? 'Go to Dashboard' : 'Create Free Account'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
