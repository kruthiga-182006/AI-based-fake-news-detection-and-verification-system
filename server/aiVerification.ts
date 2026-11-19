import type { NlpSignals } from './nlp.ts';

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

export interface VerifiedAnalysisPayload {
  title: string;
  extractedClaims: string[];
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
  resolvedArticleText?: string;
}

export class GroqVerificationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GroqVerificationError';
    this.statusCode = statusCode;
  }
}

const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'openai/gpt-oss-20b';

interface GroqExecutedTool {
  type?: string;
  name?: string;
  arguments?: unknown;
  output?: unknown;
  search_results?: {
    results?: Array<{ title?: string; url?: string; content?: string; snippet?: string }>;
  };
}

interface GroqChatMessage {
  role?: string;
  content?: string | null;
  reasoning?: string;
  executed_tools?: GroqExecutedTool[];
}

interface GroqChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    index?: number;
    finish_reason?: string;
    message?: GroqChatMessage;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function getGroqApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    throw new GroqVerificationError(
      'GROQ_API_KEY is not configured. Please add your Groq Free Plan API key in Settings > Secrets to run live news verification.',
      500
    );
  }
  return apiKey;
}

function normalizeHttpUrl(raw: string): string | null {
  try {
    const trimmed = raw.trim().replace(/[),.;'"]+$/, '');
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'example.com' ||
      host === 'www.example.com' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      (host.endsWith('exa.ai') && parsed.pathname.startsWith('/search'))
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function collectUrlsFromUnknown(
  node: unknown,
  addSource: (url: string, title?: string) => void,
  depth = 0
): void {
  if (depth > 6 || node == null) return;

  if (typeof node === 'string') {
    const trimmed = node.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && depth < 5) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        collectUrlsFromUnknown(parsed, addSource, depth + 1);
      } catch {
        // Not valid JSON; scan for URLs below
      }
    }
    const urlMatches = trimmed.match(/https?:\/\/[^\s"'<>\]\)]+/g) || [];
    for (const m of urlMatches) {
      addSource(m);
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectUrlsFromUnknown(item, addSource, depth + 1);
    }
    return;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.url === 'string') {
      addSource(obj.url, typeof obj.title === 'string' ? obj.title : undefined);
    }
    if (typeof obj.link === 'string') {
      addSource(obj.link, typeof obj.title === 'string' ? obj.title : undefined);
    }
    for (const val of Object.values(obj)) {
      collectUrlsFromUnknown(val, addSource, depth + 1);
    }
  }
}

function extractGroqGroundedSources(message?: GroqChatMessage): {
  sources: Array<{ title: string; url: string }>;
  toolExecuted: boolean;
} {
  const seen = new Set<string>();
  const results: Array<{ title: string; url: string }> = [];

  const addSource = (rawUrl: string, title?: string) => {
    const normalized = normalizeHttpUrl(rawUrl);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    let fallbackHost = 'Web Source';
    try {
      fallbackHost = new URL(normalized).hostname;
    } catch {
      // Keep fallback
    }
    results.push({
      title: (title || '').trim() || fallbackHost,
      url: normalized,
    });
  };

  const executedTools = Array.isArray(message?.executed_tools) ? message.executed_tools : [];
  const toolExecuted = executedTools.some(
    (t) =>
      t?.type === 'browser_search' ||
      t?.name === 'browser_search' ||
      Boolean(t?.search_results?.results?.length)
  );

  for (const tool of executedTools) {
    if (tool?.search_results?.results) {
      collectUrlsFromUnknown(tool.search_results.results, addSource);
    }
    if (tool?.output !== undefined) {
      collectUrlsFromUnknown(tool.output, addSource);
    }
  }

  // If browser_search executed on Groq and returned citations inside message content
  if (toolExecuted && results.length === 0 && typeof message?.content === 'string') {
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = mdLinkRegex.exec(message.content)) !== null) {
      addSource(match[2], match[1]);
    }
    const bareUrls = message.content.match(/https?:\/\/[^\s"'<>\]\)]+/g) || [];
    for (const u of bareUrls) {
      addSource(u);
    }
  }

  return { sources: results, toolExecuted };
}

function isAllowedGroundedUrl(
  url: string,
  groundedUrls: Set<string>,
  submittedUrl?: string | null
): boolean {
  if (!url) return false;
  const normalized = normalizeHttpUrl(url);
  if (!normalized) return false;
  if (groundedUrls.has(normalized) || groundedUrls.has(url)) return true;
  if (submittedUrl && (normalized === submittedUrl || url === submittedUrl)) return true;
  const stripped = normalized.replace(/\/$/, '');
  for (const g of groundedUrls) {
    if (g.replace(/\/$/, '') === stripped) return true;
  }
  return false;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) return null;
  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Attempt substring extraction from first '{' to last '}'
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchUrlExcerpt(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'TruthGuardAI-Verifier/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
    });
    if (!res.ok) return '';
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return '';
    }
    const raw = (await res.text()).slice(0, 120000);
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
    const bodyText = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const combined = pageTitle ? `${pageTitle}\n\n${bodyText}` : bodyText;
    return combined.slice(0, 2200);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function callGroqChatCompletion(
  apiKey: string,
  payload: Record<string, unknown>,
  retriesLeft = 1
): Promise<GroqChatCompletionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  let response: Response;
  try {
    response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GroqVerificationError(
        'Groq API request timed out while verifying claims. Please try again.',
        500
      );
    }
    throw new GroqVerificationError(
      `Unable to reach Groq API (${err instanceof Error ? err.message : 'network error'}). Please try again.`,
      500
    );
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await response.text().catch(() => '');
  let parsed: GroqChatCompletionResponse | null = null;
  if (rawBody) {
    try {
      parsed = JSON.parse(rawBody) as GroqChatCompletionResponse;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const apiErrMsg = parsed?.error?.message || rawBody.slice(0, 300) || `HTTP ${response.status}`;

    if (response.status === 429) {
      const retryAfterHeader = Number(response.headers.get('retry-after') || '0');
      if (retriesLeft > 0 && retryAfterHeader > 0 && retryAfterHeader <= 3) {
        await new Promise((r) => setTimeout(r, retryAfterHeader * 1000));
        return callGroqChatCompletion(apiKey, payload, retriesLeft - 1);
      }
      throw new GroqVerificationError(
        `Groq Free Plan rate limit reached: ${apiErrMsg}`,
        429
      );
    }

    if (response.status === 401) {
      throw new GroqVerificationError(
        `Groq API authentication failed: ${apiErrMsg}. Please check GROQ_API_KEY in Settings > Secrets.`,
        500
      );
    }

    if (response.status === 402 || response.status === 403) {
      throw new GroqVerificationError(
        `Groq Free Plan does not permit this request or model/tool access: ${apiErrMsg}. Please verify your free-tier account access in Groq Console without enabling paid billing.`,
        500
      );
    }

    if (response.status >= 500 && retriesLeft > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return callGroqChatCompletion(apiKey, payload, retriesLeft - 1);
    }

    throw new GroqVerificationError(`Groq API error (${response.status}): ${apiErrMsg}`, 500);
  }

  if (!parsed) {
    throw new GroqVerificationError('Groq API returned a non-JSON response.', 500);
  }

  return parsed;
}

const REPORT_JSON_SCHEMA = {
  name: 'truthguard_verification_report',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      resolvedArticleText: { type: 'string' },
      extractedClaims: { type: 'array', items: { type: 'string' } },
      credibilityScore: { type: 'integer' },
      verdict: { type: 'string', enum: ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'] },
      explanation: { type: 'string' },
      aiAnalysisSummary: { type: 'string' },
      biasDetection: {
        type: 'object',
        properties: {
          politicalOrFramingLean: { type: 'string' },
          emotionalLanguageLevel: { type: 'string', enum: ['Low', 'Moderate', 'High'] },
          sensationalIndicators: { type: 'array', items: { type: 'string' } },
          objectivityAssessment: { type: 'string' },
        },
        required: [
          'politicalOrFramingLean',
          'emotionalLanguageLevel',
          'sensationalIndicators',
          'objectivityAssessment',
        ],
        additionalProperties: false,
      },
      keyTakeaways: { type: 'array', items: { type: 'string' } },
      supportingEvidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string' },
            summary: { type: 'string' },
            sourceName: { type: 'string' },
            sourceUrl: { type: 'string' },
          },
          required: ['claim', 'summary', 'sourceName', 'sourceUrl'],
          additionalProperties: false,
        },
      },
      contradictingEvidence: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string' },
            summary: { type: 'string' },
            sourceName: { type: 'string' },
            sourceUrl: { type: 'string' },
          },
          required: ['claim', 'summary', 'sourceName', 'sourceUrl'],
          additionalProperties: false,
        },
      },
      trustedSources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            sourceType: { type: 'string' },
            relevanceNote: { type: 'string' },
          },
          required: ['title', 'url', 'sourceType', 'relevanceNote'],
          additionalProperties: false,
        },
      },
      recommendations: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'title',
      'resolvedArticleText',
      'extractedClaims',
      'credibilityScore',
      'verdict',
      'explanation',
      'aiAnalysisSummary',
      'biasDetection',
      'keyTakeaways',
      'supportingEvidence',
      'contradictingEvidence',
      'trustedSources',
      'recommendations',
    ],
    additionalProperties: false,
  },
};

export async function runNewsVerification(params: {
  cleanedText: string;
  sourceUrl?: string | null;
  nlpSignals: NlpSignals;
}): Promise<VerifiedAnalysisPayload> {
  const apiKey = getGroqApiKey();
  const { cleanedText, sourceUrl, nlpSignals } = params;

  let fetchedUrlExcerpt = '';
  if (sourceUrl) {
    fetchedUrlExcerpt = await fetchUrlExcerpt(sourceUrl);
  }

  const submittedBody = (cleanedText || fetchedUrlExcerpt || '').slice(0, 2600);

  // Single-call Groq browser_search + JSON output keeps token usage within Groq Free Plan's 8,000 TPM limit.
  const prompt = `Verify the following news item using browser_search to retrieve real evidence from authoritative sources (government portals, official records, WHO, NASA, NOAA, Reuters, AP, Snopes, PolitiFact, FactCheck.org, or peer-reviewed research).

RULES:
- Use browser_search before deciding. Never decide authenticity from writing style alone.
- Never invent URLs, studies, or quotes. Only cite exact URLs retrieved via browser_search (or the submitted URL).
- If live search finds insufficient or no independent evidence, set verdict to "UNVERIFIED" and credibilityScore <= 55.
- Score rubric: 80-100 = corroborated by multiple trusted sources; 50-79 = mixed/unverified; 0-49 = contradicted/fabricated.
- Verdict MUST be one of: TRUE, FALSE, MISLEADING, UNVERIFIED.
- Output ONLY a single valid JSON object (no markdown prose) with these exact keys:
  {
    "title": string (concise <=100 chars),
    "resolvedArticleText": string (empty "" if text was pasted, or brief summary if URL-only),
    "extractedClaims": string[],
    "credibilityScore": integer (0-100),
    "verdict": "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIED",
    "explanation": string (clearly separate AI tone/NLP analysis from externally verified facts),
    "aiAnalysisSummary": string,
    "biasDetection": {
      "politicalOrFramingLean": string,
      "emotionalLanguageLevel": "Low" | "Moderate" | "High",
      "sensationalIndicators": string[],
      "objectivityAssessment": string
    },
    "keyTakeaways": string[],
    "supportingEvidence": [{ "claim": string, "summary": string, "sourceName": string, "sourceUrl": string }],
    "contradictingEvidence": [{ "claim": string, "summary": string, "sourceName": string, "sourceUrl": string }],
    "trustedSources": [{ "title": string, "url": string, "sourceType": string, "relevanceNote": string }],
    "recommendations": string[]
  }

Submitted URL: ${sourceUrl || 'None'}
NLP Signals: words=${nlpSignals.wordCount}, uppercaseRatio=${nlpSignals.uppercaseRatio}, exclamations=${nlpSignals.exclamationCount}, sensationalTerms=[${nlpSignals.sensationalTermsFound.join(', ') || 'None'}], attribution=${nlpSignals.hasAttributionMarkers ? 'Yes' : 'No'}
News Content:
"""
${submittedBody || '(URL-only submission — inspect the URL above via browser_search)'}
"""`;

  let primaryResponse: GroqChatCompletionResponse;
  try {
    primaryResponse = await callGroqChatCompletion(apiKey, {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are TruthGuard AI, an impartial news fact-checker. Run browser_search for live evidence, never fabricate URLs, and return a single valid JSON object.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      tools: [{ type: 'browser_search' }],
      tool_choice: 'required',
      reasoning_effort: 'low',
      max_completion_tokens: 1400,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('tool_choice')) {
      primaryResponse = await callGroqChatCompletion(apiKey, {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are TruthGuard AI, an impartial news fact-checker. Use browser_search for live evidence, never fabricate URLs, and return a single valid JSON object.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        tools: [{ type: 'browser_search' }],
        tool_choice: 'auto',
        reasoning_effort: 'low',
        max_completion_tokens: 1400,
      });
    } else if (
      msg.toLowerCase().includes('browser_search') &&
      (msg.toLowerCase().includes('paid') ||
        msg.toLowerCase().includes('plan') ||
        msg.toLowerCase().includes('upgrade') ||
        msg.toLowerCase().includes('not supported') ||
        msg.toLowerCase().includes('not available'))
    ) {
      throw new GroqVerificationError(
        `Groq Free Plan does not support browser_search for ${GROQ_MODEL}: ${msg}`,
        500
      );
    } else {
      throw err;
    }
  }

  const primaryMsg = primaryResponse.choices?.[0]?.message;
  const primaryText = (primaryMsg?.content || '').trim();
  const { sources: groundedSources } = extractGroqGroundedSources(primaryMsg);

  let parsed = extractJsonObject(primaryText);

  // Fallback only if browser_search returned prose instead of valid JSON
  if (!parsed && primaryText) {
    const groundedList =
      groundedSources.length > 0
        ? groundedSources.map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`).join('\n')
        : 'None';

    const formatResponse = await callGroqChatCompletion(apiKey, {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Convert the verification findings into the exact JSON schema. Only use URLs from the provided list; set verdict to UNVERIFIED if no URLs or evidence exist.',
        },
        {
          role: 'user',
          content: `News: ${submittedBody.slice(0, 1200)}\nFindings:\n${primaryText.slice(0, 1800)}\nRetrieved URLs:\n${groundedList}`,
        },
      ],
      reasoning_effort: 'low',
      max_completion_tokens: 1200,
      response_format: {
        type: 'json_schema',
        json_schema: REPORT_JSON_SCHEMA,
      },
    });
    const formattedText = (formatResponse.choices?.[0]?.message?.content || '').trim();
    parsed = extractJsonObject(formattedText);
  }

  if (!parsed) {
    throw new GroqVerificationError(
      'Groq returned an empty or unreadable verification response. Please try again.',
      500
    );
  }

  const groundedUrlSet = new Set(groundedSources.map((s) => s.url));
  const allowedVerdicts: Verdict[] = ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED'];
  const rawVerdict = typeof parsed.verdict === 'string' ? parsed.verdict.toUpperCase() : 'UNVERIFIED';
  let verdict: Verdict = allowedVerdicts.includes(rawVerdict as Verdict)
    ? (rawVerdict as Verdict)
    : 'UNVERIFIED';

  let score = Math.round(Number(parsed.credibilityScore));
  if (Number.isNaN(score)) score = 50;
  score = Math.max(0, Math.min(100, score));

  const sanitizeEvidence = (items: unknown): EvidenceItem[] =>
    (Array.isArray(items) ? items : []).map((rawItem) => {
      const item = (rawItem && typeof rawItem === 'object' ? rawItem : {}) as Record<string, unknown>;
      const rawUrl = String(item.sourceUrl || '');
      return {
        claim: String(item.claim || ''),
        summary: String(item.summary || ''),
        sourceName: String(item.sourceName || 'Retrieved Source'),
        sourceUrl: isAllowedGroundedUrl(rawUrl, groundedUrlSet, sourceUrl) ? rawUrl : '',
      };
    });

  const rawTrusted = Array.isArray(parsed.trustedSources) ? parsed.trustedSources : [];
  const sanitizedTrustedSources: TrustedSourceItem[] = rawTrusted
    .filter((rawSrc) => {
      const src = (rawSrc && typeof rawSrc === 'object' ? rawSrc : {}) as Record<string, unknown>;
      return isAllowedGroundedUrl(String(src.url || ''), groundedUrlSet, sourceUrl);
    })
    .map((rawSrc) => {
      const src = rawSrc as Record<string, unknown>;
      return {
        title: String(src.title || 'Verified Reference'),
        url: String(src.url || ''),
        sourceType: String(src.sourceType || 'Browser Search Reference'),
        relevanceNote: String(src.relevanceNote || ''),
      };
    });

  const includedUrls = new Set(sanitizedTrustedSources.map((s) => s.url));
  for (const gs of groundedSources) {
    if (!includedUrls.has(gs.url)) {
      sanitizedTrustedSources.push({
        title: gs.title,
        url: gs.url,
        sourceType: 'Browser Search Reference',
        relevanceNote: 'Retrieved via live Groq browser_search during claim verification.',
      });
    }
  }

  let explanation = String(parsed.explanation || '');

  // Requirement 11 & 12: If live evidence is unavailable, enforce UNVERIFIED and never claim unsupported news is verified.
  if (groundedSources.length === 0) {
    verdict = 'UNVERIFIED';
    score = Math.min(score, 55);
    if (!explanation.toLowerCase().includes('unverified') && !explanation.toLowerCase().includes('live evidence')) {
      explanation = `${explanation}\n\nNote: Live browser search did not return independent external source URLs for this claim, so it is classified as UNVERIFIED.`;
    }
  }

  const rawBias = (parsed.biasDetection && typeof parsed.biasDetection === 'object'
    ? parsed.biasDetection
    : {}) as Record<string, unknown>;
  const emotionRaw = String(rawBias.emotionalLanguageLevel || 'Moderate');
  const emotionalLanguageLevel: 'Low' | 'Moderate' | 'High' =
    emotionRaw === 'Low' || emotionRaw === 'High' ? emotionRaw : 'Moderate';

  return {
    title: String(parsed.title || 'News Verification Report').slice(0, 120),
    extractedClaims: Array.isArray(parsed.extractedClaims) ? parsed.extractedClaims.map(String) : [],
    credibilityScore: score,
    verdict,
    explanation: explanation.trim(),
    aiAnalysisSummary: String(parsed.aiAnalysisSummary || ''),
    biasDetection: {
      politicalOrFramingLean: String(rawBias.politicalOrFramingLean || 'Neutral / Indeterminate'),
      emotionalLanguageLevel,
      sensationalIndicators: Array.isArray(rawBias.sensationalIndicators)
        ? rawBias.sensationalIndicators.map(String)
        : [],
      objectivityAssessment: String(rawBias.objectivityAssessment || ''),
    },
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.map(String) : [],
    supportingEvidence: sanitizeEvidence(parsed.supportingEvidence),
    contradictingEvidence: sanitizeEvidence(parsed.contradictingEvidence),
    trustedSources: sanitizedTrustedSources,
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
    groundingUsed: groundedSources.length > 0,
    resolvedArticleText: parsed.resolvedArticleText
      ? String(parsed.resolvedArticleText)
      : fetchedUrlExcerpt || undefined,
  };
}
