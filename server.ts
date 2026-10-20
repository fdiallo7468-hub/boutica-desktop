import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOUTICA_CLOUD_URL = process.env.BOUTICA_CLOUD_URL || 'https://boutica-cloud.onrender.com';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function createServer() {
  const app = express();

  // Proxy route for Boutica Cloud to eliminate browser CORS restrictions
  app.all('/api/boutica-cloud/*', async (req, res) => {
    const targetPath = req.url.replace(/^\/api\/boutica-cloud/, '');
    const targetUrl = `${BOUTICA_CLOUD_URL}${targetPath}`;

    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection' && typeof value === 'string') {
          headers[key] = value;
        }
      }

      // Collect request body for non-GET/HEAD methods
      let body: Buffer | undefined = undefined;
      if (!['GET', 'HEAD'].includes(req.method)) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body ? new Uint8Array(body) : undefined,
      });

      res.status(response.status);
      response.headers.forEach((val, key) => {
        // Forward set-auth-token and standard headers
        res.setHeader(key, val);
      });

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(502).json({
        ok: false,
        status: 0,
        error: `Impossible de joindre Boutica Cloud (${err?.message || 'Erreur réseau'}).`,
      });
    }
  });

  // In production, serve static files
  if (process.env.NODE_ENV === 'production') {
    const staticDir = path.join(__dirname, 'dist', 'renderer');
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    // In dev mode, mount Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Boutica Desktop dev/preview server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
