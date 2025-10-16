import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Simple dev proxy endpoint to avoid CORS when calling OpenAI from the browser
        middlewareMode: false,
      },
      plugins: [
        react(),
        {
          name: 'openai-proxy',
          configureServer(server) {
            server.middlewares.use('/api/openai/models', async (req, res) => {
              try {
                const auth = (req.headers['authorization'] as string | undefined);
                if (!auth || !/^Bearer\s+\S+/.test(auth)) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'missing_authorization', message: 'Provide Authorization: Bearer <OPENAI_API_KEY>' }));
                  return;
                }
                const r = await fetch('https://api.openai.com/v1/models', {
                  headers: { Authorization: auth },
                });
                const text = await r.text();
                res.statusCode = r.status;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.end(text);
              } catch (e: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'upstream_error', message: e?.message || 'Proxy error' }));
              }
            });

            // Proxy for OpenAI Chat Completions (POST)
            server.middlewares.use('/api/openai/chat', async (req, res) => {
              try {
                if (req.method !== 'POST') {
                  res.statusCode = 405;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                  return;
                }

                const auth = (req.headers['authorization'] as string | undefined);
                if (!auth || !/^Bearer\s+\S+/.test(auth)) {
                  res.statusCode = 401;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'missing_authorization', message: 'Provide Authorization: Bearer <OPENAI_API_KEY>' }));
                  return;
                }

                let requestBody = '';
                req.on('data', chunk => { requestBody += chunk; });
                req.on('end', async () => {
                  try {
                    const r = await fetch('https://api.openai.com/v1/chat/completions', {
                      method: 'POST',
                      headers: {
                        'Authorization': auth,
                        'Content-Type': 'application/json',
                      },
                      body: requestBody,
                    });
                    const text = await r.text();
                    res.statusCode = r.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Cache-Control', 'public, max-age=60');
                    res.end(text);
                  } catch (err: any) {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'upstream_error', message: err?.message || 'Proxy error' }));
                  }
                });
              } catch (e: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'upstream_error', message: e?.message || 'Proxy error' }));
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || ''),
        'import.meta.env.OPENAI_PROXY_URL': JSON.stringify(env.OPENAI_PROXY_URL || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
