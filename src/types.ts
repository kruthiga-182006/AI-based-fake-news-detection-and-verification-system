export interface User {
  id: number;
  fullName: string;
  email: string;
  username: string;
  createdAt: string;
}

export type Verdict = 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIED';

export interface EvidenceItem {
  claim: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
}

export interface TrustedSourceItem {
  title: string;
  url: string;
  sourceType: string;
  relevanceNote: string;
}

export interface BiasDetection {
  politicalOrFramingLean: string;
  emotionalLanguageLevel: 'Low' | 'Moderate' | 'High';
  sensationalIndicators: string[];
  objectivityAssessment: string;
}

export interface NlpSignals {
  wordCount?: number;
  sentenceCount?: number;
  uppercaseRatio?: number;
  exclamationCount?: number;
  questionCount?: number;
  sensationalTermsFound?: string[];
  hasAttributionMarkers?: boolean;
}

export interface AnalysisReport {
  id: number;
  title: string;
  inputType: 'text' | 'url' | 'combined';
  sourceUrl: string | null;
  rawContent: string;
  cleanedContent: string;
  extractedClaims: string[];
  nlpSignals: NlpSignals;
  createdAt: string;
  credibilityScore: number;
  verdict: Verdict;
  explanation: string;
  aiAnalysisSummary: string;
  biasDetection: BiasDetection;
  keyTakeaways: string[];
  supportingEvidence: EvidenceItem[];
  contradictingEvidence: EvidenceItem[];
  trustedSources: TrustedSourceItem[];
  recommendations: string[];
  groundingUsed: boolean;
}

export interface DashboardSummaryItem {
  id: number;
  title: string;
  inputType: 'text' | 'url' | 'combined';
  sourceUrl: string | null;
  createdAt: string;
  credibilityScore: number;
  verdict: Verdict;
  groundingUsed: boolean;
}

export interface DashboardStats {
  totalAnalyzed: number;
  trueCount: number;
  falseCount: number;
  misleadingCount: number;
  unverifiedCount: number;
  averageScore: number;
}

export interface FeedbackEntry {
  id: number;
  analysisId: number | null;
  analysisTitle: string | null;
  rating: number;
  category: string;
  comments: string;
  createdAt: string;
}
