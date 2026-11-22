import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Request, Response, NextFunction } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Fixed Owner Email bound to the registered NYKTERIA store owner
const FIXED_OWNER_EMAIL = (
  process.env.OWNER_ADMIN_EMAIL || 'nykteriacloths@gmail.com'
)
  .trim()
  .toLowerCase();

const ENV_OWNER_PASSWORD = (process.env.OWNER_ADMIN_PASSWORD || '').trim();
const TOKEN_HMAC_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface PasswordHashRecord {
  salt: string;
  hashHex: string;
}

// In-memory store for runtime-claimed owner password (scrypt) and active Bearer sessions
let claimedOwnerHash: PasswordHashRecord | null = null;
const activeSessions = new Map<string, { email: string; expiresAt: number }>();

// Basic sliding-window brute-force limiter per client IP for auth routes
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_AUTH_ATTEMPTS = 12;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_AUTH_ATTEMPTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function hashWithScrypt(password: string, salt?: string): PasswordHashRecord {
  const resolvedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, resolvedSalt, 64);
  return {
    salt: resolvedSalt,
    hashHex: derived.toString('hex'),
  };
}

function verifyScryptPassword(password: string, record: PasswordHashRecord): boolean {
  try {
    const expected = Buffer.from(record.hashHex, 'hex');
    const actual = crypto.scryptSync(password, record.salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function safeCompareSecret(input: string, expected: string): boolean {
  const a = crypto.createHmac('sha256', TOKEN_HMAC_SECRET).update(input).digest();
  const b = crypto.createHmac('sha256', TOKEN_HMAC_SECRET).update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function createSessionToken(email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    email,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

function verifySessionToken(req: Request): { email: string } | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return { email: session.email };
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const session = verifySessionToken(req);
  if (!session) {
    res.status(401).json({ error: 'Owner authentication required.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  // Admin status (does not expose credentials)
  app.get('/api/admin/status', (req, res) => {
    const session = verifySessionToken(req);
    const isConfigured = Boolean(ENV_OWNER_PASSWORD || claimedOwnerHash);
    res.json({
      isConfigured,
      envManaged: Boolean(ENV_OWNER_PASSWORD),
      authenticated: Boolean(session),
      ownerEmail: session ? session.email : undefined,
    });
  });

  // First-run owner password claim for preview when OWNER_ADMIN_PASSWORD env var is unset
  app.post('/api/admin/claim', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many authentication attempts. Try again later.' });
      return;
    }

    if (ENV_OWNER_PASSWORD || claimedOwnerHash) {
      res.status(409).json({
        error: 'Owner access is already initialized. Sign in with your owner email and password.',
      });
      return;
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !safeCompareSecret(email, FIXED_OWNER_EMAIL)) {
      res.status(403).json({
        error: 'Access restricted to the registered NYKTERIA owner email.',
      });
      return;
    }

    if (password.length < 6 || password.length > 128) {
      res.status(400).json({
        error: 'Password must be between 6 and 128 characters.',
      });
      return;
    }

    claimedOwnerHash = hashWithScrypt(password);
    const token = createSessionToken(FIXED_OWNER_EMAIL);
    res.status(201).json({
      token,
      ownerEmail: FIXED_OWNER_EMAIL,
      envManaged: false,
    });
  });

  // Owner email + password login
  app.post('/api/admin/login', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkAuthRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many login attempts. Please wait before trying again.' });
      return;
    }

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Enter both your owner email and password.' });
      return;
    }

    if (!ENV_OWNER_PASSWORD && !claimedOwnerHash) {
      res.status(409).json({
        error: 'Owner password is not set yet. Initialize your password first.',
        needsSetup: true,
      });
      return;
    }

    const emailValid = safeCompareSecret(email, FIXED_OWNER_EMAIL);
    const passwordValid = ENV_OWNER_PASSWORD
      ? safeCompareSecret(password, ENV_OWNER_PASSWORD)
      : claimedOwnerHash
      ? verifyScryptPassword(password, claimedOwnerHash)
      : false;

    if (!emailValid || !passwordValid) {
      res.status(401).json({ error: 'Invalid owner email or password.' });
      return;
    }

    const token = createSessionToken(FIXED_OWNER_EMAIL);
    res.json({
      token,
      ownerEmail: FIXED_OWNER_EMAIL,
      envManaged: Boolean(ENV_OWNER_PASSWORD),
    });
  });

  // Authenticated password rotation (only when using runtime-claimed credential)
  app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
    if (ENV_OWNER_PASSWORD) {
      res.status(400).json({
        error: 'Password is managed via OWNER_ADMIN_PASSWORD in environment secrets.',
      });
      return;
    }

    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!claimedOwnerHash || !verifyScryptPassword(currentPassword, claimedOwnerHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      res.status(400).json({ error: 'New password must be between 6 and 128 characters.' });
      return;
    }

    claimedOwnerHash = hashWithScrypt(newPassword);
    res.json({ updated: true });
  });

  // Lock Admin & revoke Bearer token
  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ locked: true });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NYKTERIA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
