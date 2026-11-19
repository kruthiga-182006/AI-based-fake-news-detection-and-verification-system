import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS News_Analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      input_type TEXT NOT NULL CHECK (input_type IN ('text', 'url', 'combined')),
      source_url TEXT,
      raw_content TEXT NOT NULL,
      cleaned_content TEXT NOT NULL,
      extracted_claims_json TEXT NOT NULL DEFAULT '[]',
      nlp_signals_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Analysis_Results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id INTEGER NOT NULL UNIQUE,
      credibility_score INTEGER NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 100),
      verdict TEXT NOT NULL CHECK (verdict IN ('TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIED')),
      explanation TEXT NOT NULL,
      ai_summary TEXT NOT NULL,
      bias_detection_json TEXT NOT NULL DEFAULT '{}',
      key_takeaways_json TEXT NOT NULL DEFAULT '[]',
      supporting_evidence_json TEXT NOT NULL DEFAULT '[]',
      contradicting_evidence_json TEXT NOT NULL DEFAULT '[]',
      trusted_sources_json TEXT NOT NULL DEFAULT '[]',
      recommendations_json TEXT NOT NULL DEFAULT '[]',
      grounding_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (analysis_id) REFERENCES News_Analysis(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      analysis_id INTEGER,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      category TEXT NOT NULL DEFAULT 'General',
      comments TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (analysis_id) REFERENCES News_Analysis(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_news_analysis_user ON News_Analysis(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON Feedback(user_id, created_at DESC);
  `);

  // Migrate legacy News_Analysis where user_id was NOT NULL so guest analyses work seamlessly
  const columns = db.prepare('PRAGMA table_info(News_Analysis)').all() as Array<{
    name: string;
    notnull: number;
  }>;
  const userCol = columns.find((c) => c.name === 'user_id');
  if (userCol && userCol.notnull === 1) {
    db.pragma('foreign_keys = OFF');
    const migrate = db.transaction(() => {
      db.exec(`
        CREATE TABLE News_Analysis_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT NOT NULL,
          input_type TEXT NOT NULL CHECK (input_type IN ('text', 'url', 'combined')),
          source_url TEXT,
          raw_content TEXT NOT NULL,
          cleaned_content TEXT NOT NULL,
          extracted_claims_json TEXT NOT NULL DEFAULT '[]',
          nlp_signals_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
        );
        INSERT INTO News_Analysis_new (id, user_id, title, input_type, source_url, raw_content, cleaned_content, extracted_claims_json, nlp_signals_json, created_at)
        SELECT id, user_id, title, input_type, source_url, raw_content, cleaned_content, extracted_claims_json, nlp_signals_json, created_at FROM News_Analysis;
        DROP TABLE News_Analysis;
        ALTER TABLE News_Analysis_new RENAME TO News_Analysis;
        CREATE INDEX IF NOT EXISTS idx_news_analysis_user ON News_Analysis(user_id, created_at DESC);
      `);
    });
    migrate();
    db.pragma('foreign_keys = ON');
  }
}
