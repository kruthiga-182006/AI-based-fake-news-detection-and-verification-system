import net from 'net';

export interface NlpSignals {
  wordCount: number;
  sentenceCount: number;
  uppercaseRatio: number;
  exclamationCount: number;
  questionCount: number;
  sensationalTermsFound: string[];
  hasAttributionMarkers: boolean;
}

const SENSATIONAL_LEXICON = [
  'shocking',
  'bombshell',
  'miracle',
  'secretly',
  'they dont want you to know',
  "they don't want you to know",
  'exposed',
  'unbelievable',
  'hoax',
  'cover-up',
  'coverup',
  'mainstream media refuses',
  '100% proven',
  'guaranteed cure',
  'breaking exclusive',
  'wake up',
  'panic',
  'destroyed',
];

const ATTRIBUTION_MARKERS = [
  'according to',
  'reported by',
  'published in',
  'study',
  'data from',
  'official',
  'statement',
  'spokesperson',
  'university',
  'ministry',
  'department',
  'reuters',
  'associated press',
  'bbc',
];

export function cleanNewsText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractNlpSignals(cleanedText: string): NlpSignals {
  const words = cleanedText.split(/\s+/).filter(Boolean);
  const sentences = cleanedText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const letters = cleanedText.replace(/[^a-zA-Z]/g, '');
  const upperLetters = cleanedText.replace(/[^A-Z]/g, '');
  const uppercaseRatio =
    letters.length > 0 ? Number((upperLetters.length / letters.length).toFixed(3)) : 0;

  const exclamationCount = (cleanedText.match(/!/g) || []).length;
  const questionCount = (cleanedText.match(/\?/g) || []).length;
  const lower = cleanedText.toLowerCase();

  const sensationalTermsFound = SENSATIONAL_LEXICON.filter((term) => lower.includes(term));
  const hasAttributionMarkers = ATTRIBUTION_MARKERS.some((marker) => lower.includes(marker));

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    uppercaseRatio,
    exclamationCount,
    questionCount,
    sensationalTermsFound,
    hasAttributionMarkers,
  };
}

export function deriveShortTitle(cleanedText: string, sourceUrl?: string | null): string {
  if (cleanedText) {
    const firstLine = cleanedText.split('\n')[0]?.trim() || cleanedText;
    if (firstLine.length <= 84) return firstLine;
    return `${firstLine.slice(0, 81).trim()}...`;
  }
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl);
      return `URL Verification: ${parsed.hostname}${parsed.pathname.slice(0, 40)}`;
    } catch {
      return 'URL Verification Analysis';
    }
  }
  return 'Untitled News Analysis';
}

export function validateExternalUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: true };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Please enter a valid URL starting with https:// or http://.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { valid: false, error: 'Local or internal network URLs are not permitted.' };
  }

  if (net.isIP(host)) {
    const parts = host.split('.').map(Number);
    if (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 169
    ) {
      return { valid: false, error: 'Private IP address URLs are not permitted.' };
    }
  }

  return { valid: true, normalized: parsed.toString() };
}
