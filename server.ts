import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  resetPasswordHandler,
} from './server/auth.ts';
import { initializeDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

dotenv.config();

async function startServer() {
  initializeDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Authentication endpoints
  app.post('/api/auth/register', registerHandler);
  app.post('/api/auth/login', loginHandler);
  app.post('/api/auth/logout', logoutHandler);
  app.get('/api/auth/me', meHandler);
  app.post('/api/auth/forgot-password', forgotPasswordHandler);
  app.post('/api/auth/reset-password', resetPasswordHandler);

  // Application REST endpoints
  app.use('/api', apiRouter);

  // Return 404 JSON for unmatched /api paths instead of SPA HTML fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Ensure API errors always return structured JSON
  app.use(
    '/api',
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const message = err instanceof Error ? err.message : 'Unexpected server error.';
      console.error('API Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    }
  );

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    let viteServer: ViteDevServer | null = null;
    const viteReady = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    }).then((vite) => {
      viteServer = vite;
      return vite;
    });

    app.use(async (req, res, next) => {
      try {
        const vite = viteServer ?? (await viteReady);
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`TruthGuard AI server listening on http://0.0.0.0:${PORT}`);
    });

    await viteReady;
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`TruthGuard AI server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start TruthGuard AI server:', err);
  process.exit(1);
});
