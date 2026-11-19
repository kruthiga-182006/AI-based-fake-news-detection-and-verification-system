import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from './db.ts';

const COOKIE_NAME = 'truthguard_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  const secretPath = path.resolve(process.cwd(), 'database', '.session_secret');
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  return generated;
}

const SESSION_SECRET = getSessionSecret();

export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  username: string;
  createdAt: string;
}

interface DbUserRow {
  id: number;
  full_name: string;
  email: string;
  username: string;
  password_hash: string;
  reset_token: string | null;
  reset_token_expires: string | null;
  created_at: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

function signSessionToken(userId: number): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { uid: number; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid: number;
      exp: number;
    };
    if (!parsed.uid || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return req.secure || process.env.NODE_ENV === 'production';
}

function setSessionCookie(req: Request, res: Response, userId: number): string {
  const token = signSessionToken(userId);
  const secure = isSecureRequest(req);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
  return token;
}

function mapUser(row: DbUserRow): SessionUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    username: row.username,
    createdAt: row.created_at,
  };
}

function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }
  return null;
}

export function getUserFromRequest(req: Request): SessionUser | null {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const verified = verifySessionToken(token);
  if (!verified) return null;
  const row = db
    .prepare('SELECT id, full_name, email, username, created_at FROM Users WHERE id = ?')
    .get(verified.uid) as DbUserRow | undefined;
  return row ? mapUser(row) : null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
    return;
  }
  req.user = user;
  next();
}

export function registerHandler(req: Request, res: Response): void {
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

  if (fullName.length < 2 || fullName.length > 80) {
    res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    res.status(400).json({
      error: 'Username must be 3–30 characters and contain only letters, numbers, underscores, dots, or hyphens.',
    });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Password and confirmation password do not match.' });
    return;
  }

  const existing = db
    .prepare('SELECT id, email, username FROM Users WHERE lower(email) = ? OR lower(username) = ?')
    .get(email, username.toLowerCase()) as { id: number; email: string; username: string } | undefined;

  if (existing) {
    if (existing.email.toLowerCase() === email) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }
    res.status(409).json({ error: 'This username is already taken.' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      'INSERT INTO Users (full_name, email, username, password_hash) VALUES (?, ?, ?, ?)'
    )
    .run(fullName, email, username, passwordHash);

  const created = db
    .prepare('SELECT id, full_name, email, username, created_at FROM Users WHERE id = ?')
    .get(result.lastInsertRowid) as DbUserRow;

  const token = setSessionCookie(req, res, created.id);
  res.status(201).json({ user: mapUser(created), token });
}

export function loginHandler(req: Request, res: Response): void {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!identifier || !password) {
    res.status(400).json({ error: 'Username or email and password are required.' });
    return;
  }

  const userRow = db
    .prepare(
      'SELECT id, full_name, email, username, password_hash, created_at FROM Users WHERE lower(email) = ? OR lower(username) = ?'
    )
    .get(identifier.toLowerCase(), identifier.toLowerCase()) as DbUserRow | undefined;

  if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid username/email or password.' });
    return;
  }

  const token = setSessionCookie(req, res, userRow.id);
  res.json({ user: mapUser(userRow), token });
}

export function logoutHandler(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
  res.json({ ok: true });
}

export function meHandler(req: Request, res: Response): void {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({ user });
}

export function forgotPasswordHandler(req: Request, res: Response): void {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
  if (!identifier) {
    res.status(400).json({ error: 'Please enter your registered email address or username.' });
    return;
  }

  const userRow = db
    .prepare('SELECT id, email FROM Users WHERE lower(email) = ? OR lower(username) = ?')
    .get(identifier, identifier) as { id: number; email: string } | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'No account found matching that email or username.' });
    return;
  }

  const resetToken = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare('UPDATE Users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
    resetToken,
    expiresAt,
    userRow.id
  );

  res.json({
    message:
      'A one-time password recovery code has been generated for this local workspace session (expires in 15 minutes).',
    recoveryCode: resetToken,
    email: userRow.email,
  });
}

export function resetPasswordHandler(req: Request, res: Response): void {
  const identifier = typeof req.body?.identifier === 'string' ? req.body.identifier.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!identifier || !code || newPassword.length < 8) {
    res.status(400).json({
      error: 'Account identifier, 6-digit recovery code, and a new password (8+ characters) are required.',
    });
    return;
  }

  const userRow = db
    .prepare(
      'SELECT id, reset_token, reset_token_expires FROM Users WHERE lower(email) = ? OR lower(username) = ?'
    )
    .get(identifier, identifier) as DbUserRow | undefined;

  if (!userRow || !userRow.reset_token || userRow.reset_token !== code) {
    res.status(400).json({ error: 'Invalid recovery code.' });
    return;
  }

  if (!userRow.reset_token_expires || Date.now() > Date.parse(userRow.reset_token_expires)) {
    res.status(400).json({ error: 'Recovery code has expired. Please request a new one.' });
    return;
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    'UPDATE Users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
  ).run(passwordHash, userRow.id);

  res.json({ message: 'Your password has been updated. You can now log in.' });
}
