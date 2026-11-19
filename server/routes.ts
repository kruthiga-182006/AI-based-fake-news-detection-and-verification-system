import { Router, type Response } from 'express';
import { type AuthenticatedRequest, getUserFromRequest, requireAuth } from './auth.ts';
import { GroqVerificationError, runNewsVerification } from './aiVerification.ts';
import { db } from './db.ts';
import {
  cleanNewsText,
  deriveShortTitle,
  extractNlpSignals,
  validateExternalUrl,
} from './nlp.ts';

export const apiRouter = Router();

interface AnalysisJoinedRow {
  id: number;
  user_id: number;
  title: string;
  input_type: 'text' | 'url' | 'combined';
  source_url: string | null;
  raw_content: string;
  cleaned_content: string;
  extracted_claims_json: string;
  nlp_signals_json: string;
  created_at: string;
  credibility_score: number;
  verdict: 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIED';
  explanation: string;
  ai_summary: string;
  bias_detection_json: string;
  key_takeaways_json: string;
  supporting_evidence_json: string;
  contradicting_evidence_json: string;
  trusted_sources_json: string;
  recommendations_json: string;
  grounding_used: number;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serializeAnalysisRow(row: AnalysisJoinedRow) {
  return {
    id: row.id,
    title: row.title,
    inputType: row.input_type,
    sourceUrl: row.source_url,
    rawContent: row.raw_content,
    cleanedContent: row.cleaned_content,
    extractedClaims: safeJsonParse<string[]>(row.extracted_claims_json, []),
    nlpSignals: safeJsonParse<Record<string, unknown>>(row.nlp_signals_json, {}),
    createdAt: row.created_at,
    credibilityScore: row.credibility_score,
    verdict: row.verdict,
    explanation: row.explanation,
    aiAnalysisSummary: row.ai_summary,
    biasDetection: safeJsonParse(row.bias_detection_json, {
      politicalOrFramingLean: 'Indeterminate',
      emotionalLanguageLevel: 'Moderate',
      sensationalIndicators: [],
      objectivityAssessment: '',
    }),
    keyTakeaways: safeJsonParse<string[]>(row.key_takeaways_json, []),
    supportingEvidence: safeJsonParse(row.supporting_evidence_json, []),
    contradictingEvidence: safeJsonParse(row.contradicting_evidence_json, []),
    trustedSources: safeJsonParse(row.trusted_sources_json, []),
    recommendations: safeJsonParse<string[]>(row.recommendations_json, []),
    groundingUsed: Boolean(row.grounding_used),
  };
}

apiRouter.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const statsRow = db
    .prepare(
      `SELECT
        COUNT(*) AS totalAnalyzed,
        SUM(CASE WHEN ar.verdict = 'TRUE' THEN 1 ELSE 0 END) AS trueCount,
        SUM(CASE WHEN ar.verdict = 'FALSE' THEN 1 ELSE 0 END) AS falseCount,
        SUM(CASE WHEN ar.verdict = 'MISLEADING' THEN 1 ELSE 0 END) AS misleadingCount,
        SUM(CASE WHEN ar.verdict = 'UNVERIFIED' THEN 1 ELSE 0 END) AS unverifiedCount,
        ROUND(AVG(ar.credibility_score), 1) AS averageScore
      FROM News_Analysis na
      JOIN Analysis_Results ar ON ar.analysis_id = na.id
      WHERE na.user_id = ?`
    )
    .get(userId) as {
    totalAnalyzed: number;
    trueCount: number | null;
    falseCount: number | null;
    misleadingCount: number | null;
    unverifiedCount: number | null;
    averageScore: number | null;
  };

  const recentRows = db
    .prepare(
      `SELECT
        na.id, na.title, na.input_type, na.source_url, na.created_at,
        ar.credibility_score, ar.verdict, ar.grounding_used
      FROM News_Analysis na
      JOIN Analysis_Results ar ON ar.analysis_id = na.id
      WHERE na.user_id = ?
      ORDER BY na.created_at DESC, na.id DESC
      LIMIT 6`
    )
    .all(userId) as Array<{
    id: number;
    title: string;
    input_type: string;
    source_url: string | null;
    created_at: string;
    credibility_score: number;
    verdict: string;
    grounding_used: number;
  }>;

  res.json({
    stats: {
      totalAnalyzed: statsRow.totalAnalyzed || 0,
      trueCount: statsRow.trueCount || 0,
      falseCount: statsRow.falseCount || 0,
      misleadingCount: statsRow.misleadingCount || 0,
      unverifiedCount: statsRow.unverifiedCount || 0,
      averageScore: statsRow.averageScore ?? 0,
    },
    recentAnalyses: recentRows.map((r) => ({
      id: r.id,
      title: r.title,
      inputType: r.input_type,
      sourceUrl: r.source_url,
      createdAt: r.created_at,
      credibilityScore: r.credibility_score,
      verdict: r.verdict,
      groundingUsed: Boolean(r.grounding_used),
    })),
  });
});

apiRouter.post('/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getUserFromRequest(req);
    const userId = user ? user.id : null;
    const rawText = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

    if (!rawText && !rawUrl) {
      res.status(400).json({ error: 'Please paste news text or provide a valid news URL to analyze.' });
      return;
    }

    const urlCheck = validateExternalUrl(rawUrl);
    if (!urlCheck.valid) {
      res.status(400).json({ error: urlCheck.error || 'Invalid URL provided.' });
      return;
    }

    const cleanedText = cleanNewsText(rawText);
    if (cleanedText && cleanedText.length < 5 && !urlCheck.normalized) {
      res.status(400).json({
        error: 'Please enter at least 5 characters of news content or a valid article URL.',
      });
      return;
    }

    if (cleanedText.length > 20000) {
      res.status(400).json({
        error: 'Submitted text exceeds the 20,000-character limit. Please trim the excerpt.',
      });
      return;
    }

    const inputType: 'text' | 'url' | 'combined' =
      cleanedText && urlCheck.normalized ? 'combined' : urlCheck.normalized ? 'url' : 'text';

    const nlpSignals = extractNlpSignals(cleanedText);

    const verification = await runNewsVerification({
      cleanedText,
      sourceUrl: urlCheck.normalized || null,
      nlpSignals,
    });

    const effectiveContent = cleanedText || verification.resolvedArticleText || urlCheck.normalized || '';
    const title = verification.title || deriveShortTitle(cleanedText, urlCheck.normalized);

    const insertAnalysis = db.transaction(() => {
      const analysisRes = db
        .prepare(
          `INSERT INTO News_Analysis (
            user_id, title, input_type, source_url, raw_content, cleaned_content,
            extracted_claims_json, nlp_signals_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          title,
          inputType,
          urlCheck.normalized || null,
          rawText || urlCheck.normalized || '',
          effectiveContent,
          JSON.stringify(verification.extractedClaims),
          JSON.stringify(nlpSignals)
        );

      const analysisId = Number(analysisRes.lastInsertRowid);

      db.prepare(
        `INSERT INTO Analysis_Results (
          analysis_id, credibility_score, verdict, explanation, ai_summary,
          bias_detection_json, key_takeaways_json, supporting_evidence_json,
          contradicting_evidence_json, trusted_sources_json, recommendations_json,
          grounding_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        analysisId,
        verification.credibilityScore,
        verification.verdict,
        verification.explanation,
        verification.aiAnalysisSummary,
        JSON.stringify(verification.biasDetection),
        JSON.stringify(verification.keyTakeaways),
        JSON.stringify(verification.supportingEvidence),
        JSON.stringify(verification.contradictingEvidence),
        JSON.stringify(verification.trustedSources),
        JSON.stringify(verification.recommendations),
        verification.groundingUsed ? 1 : 0
      );

      return analysisId;
    });

    const analysisId = insertAnalysis();
    const saved = db
      .prepare(
        `SELECT na.*, ar.credibility_score, ar.verdict, ar.explanation, ar.ai_summary,
          ar.bias_detection_json, ar.key_takeaways_json, ar.supporting_evidence_json,
          ar.contradicting_evidence_json, ar.trusted_sources_json, ar.recommendations_json,
          ar.grounding_used
         FROM News_Analysis na
         JOIN Analysis_Results ar ON ar.analysis_id = na.id
         WHERE na.id = ?`
      )
      .get(analysisId) as AnalysisJoinedRow;

    res.status(201).json({ analysis: serializeAnalysisRow(saved) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to complete verification analysis.';
    const rawStatus = err instanceof GroqVerificationError ? err.statusCode : 500;
    const safeStatus = rawStatus === 429 ? 429 : 500;
    console.error('Analysis endpoint error:', err);
    if (!res.headersSent) {
      res.status(safeStatus).json({ error: message });
    }
  }
});

apiRouter.get('/analyses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const verdictFilter = typeof req.query.verdict === 'string' ? req.query.verdict.toUpperCase() : 'ALL';
  const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  const rows = db
    .prepare(
      `SELECT na.*, ar.credibility_score, ar.verdict, ar.explanation, ar.ai_summary,
        ar.bias_detection_json, ar.key_takeaways_json, ar.supporting_evidence_json,
        ar.contradicting_evidence_json, ar.trusted_sources_json, ar.recommendations_json,
        ar.grounding_used
       FROM News_Analysis na
       JOIN Analysis_Results ar ON ar.analysis_id = na.id
       WHERE na.user_id = ?
       ORDER BY na.created_at DESC, na.id DESC`
    )
    .all(userId) as AnalysisJoinedRow[];

  const filtered = rows.filter((row) => {
    if (verdictFilter !== 'ALL' && row.verdict !== verdictFilter) return false;
    if (searchQuery) {
      const hay = `${row.title} ${row.cleaned_content} ${row.source_url || ''}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    return true;
  });

  res.json({ analyses: filtered.map(serializeAnalysisRow) });
});

apiRouter.get('/analyses/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = getUserFromRequest(req);
  const analysisId = Number(req.params.id);
  if (!Number.isInteger(analysisId) || analysisId <= 0) {
    res.status(400).json({ error: 'Invalid analysis ID.' });
    return;
  }

  const row = db
    .prepare(
      `SELECT na.*, ar.credibility_score, ar.verdict, ar.explanation, ar.ai_summary,
        ar.bias_detection_json, ar.key_takeaways_json, ar.supporting_evidence_json,
        ar.contradicting_evidence_json, ar.trusted_sources_json, ar.recommendations_json,
        ar.grounding_used
       FROM News_Analysis na
       JOIN Analysis_Results ar ON ar.analysis_id = na.id
       WHERE na.id = ? AND (na.user_id IS NULL OR na.user_id = ?)`
    )
    .get(analysisId, user ? user.id : -1) as AnalysisJoinedRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Analysis report not found.' });
    return;
  }

  res.json({ analysis: serializeAnalysisRow(row) });
});

apiRouter.delete('/analyses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const analysisId = Number(req.params.id);
  if (!Number.isInteger(analysisId) || analysisId <= 0) {
    res.status(400).json({ error: 'Invalid analysis ID.' });
    return;
  }

  const info = db
    .prepare('DELETE FROM News_Analysis WHERE id = ? AND user_id = ?')
    .run(analysisId, userId);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Analysis report not found.' });
    return;
  }

  res.json({ ok: true });
});

apiRouter.get('/feedback', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT f.id, f.analysis_id, f.rating, f.category, f.comments, f.created_at, na.title AS analysis_title
       FROM Feedback f
       LEFT JOIN News_Analysis na ON na.id = f.analysis_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC, f.id DESC`
    )
    .all(userId) as Array<{
    id: number;
    analysis_id: number | null;
    rating: number;
    category: string;
    comments: string;
    created_at: string;
    analysis_title: string | null;
  }>;

  res.json({
    feedbackList: rows.map((r) => ({
      id: r.id,
      analysisId: r.analysis_id,
      analysisTitle: r.analysis_title,
      rating: r.rating,
      category: r.category,
      comments: r.comments,
      createdAt: r.created_at,
    })),
  });
});

apiRouter.post('/feedback', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const rating = Number(req.body?.rating);
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'General';
  const comments = typeof req.body?.comments === 'string' ? req.body.comments.trim() : '';
  const analysisIdRaw = req.body?.analysisId ? Number(req.body.analysisId) : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Please select a rating between 1 and 5.' });
    return;
  }

  if (comments.length < 5 || comments.length > 2000) {
    res.status(400).json({ error: 'Please enter feedback comments between 5 and 2,000 characters.' });
    return;
  }

  let validatedAnalysisId: number | null = null;
  if (analysisIdRaw !== null) {
    if (!Number.isInteger(analysisIdRaw) || analysisIdRaw <= 0) {
      res.status(400).json({ error: 'Invalid linked analysis ID.' });
      return;
    }
    const owned = db
      .prepare('SELECT id FROM News_Analysis WHERE id = ? AND user_id = ?')
      .get(analysisIdRaw, userId);
    if (!owned) {
      res.status(404).json({ error: 'Referenced analysis not found.' });
      return;
    }
    validatedAnalysisId = analysisIdRaw;
  }

  const insert = db
    .prepare(
      'INSERT INTO Feedback (user_id, analysis_id, rating, category, comments) VALUES (?, ?, ?, ?, ?)'
    )
    .run(userId, validatedAnalysisId, rating, category || 'General', comments);

  const created = db
    .prepare(
      `SELECT f.id, f.analysis_id, f.rating, f.category, f.comments, f.created_at, na.title AS analysis_title
       FROM Feedback f
       LEFT JOIN News_Analysis na ON na.id = f.analysis_id
       WHERE f.id = ?`
    )
    .get(insert.lastInsertRowid) as {
    id: number;
    analysis_id: number | null;
    rating: number;
    category: string;
    comments: string;
    created_at: string;
    analysis_title: string | null;
  };

  res.status(201).json({
    feedback: {
      id: created.id,
      analysisId: created.analysis_id,
      analysisTitle: created.analysis_title,
      rating: created.rating,
      category: created.category,
      comments: created.comments,
      createdAt: created.created_at,
    },
  });
});
