import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        // Simple dev proxy endpoint to avoid CORS when calling OpenAI from the browser
        middlewareMode: false,
      },
      plugins: [
        react(),
        {
          name: 'api-proxy',
          configureServer(server) {
            console.log('🔧 [CONFIG] Starting server configuration...');
            
            // Debug middleware to catch all requests
            server.middlewares.use((req, res, next) => {
              console.log(`🔍 [DEBUG] ${req.method} ${req.url}`);
              next();
            });

            // Direct API calls - no proxy needed

            // Helper functions
            const fetchWithFallback = async (url1: string, init: any, url2?: string) => {
              try {
                const r1 = await fetch(url1, init);
                if (!r1.ok && r1.status >= 500 && url2) {
                  // try secondary host on server-side errors
                  const r2 = await fetch(url2, init);
                  return r2;
                }
                return r1;
              } catch (err) {
                if (url2) {
                  return await fetch(url2, init);
                }
                throw err;
              }
            };


            // No proxy middleware needed - using direct API calls


            const extractToken = (req: any): string | null => {
              const auth = (req.headers['authorization'] as string | undefined) || '';
              const xKey = (req.headers['x-api-key'] as string | undefined) || '';
              if (/^Bearer\s+\S+/.test(auth)) return auth.replace(/^Bearer\s+/, '').trim();
              if (xKey && xKey.trim().length > 0) return xKey.trim();
              return null;
            };

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

            // Higgsfield proxy endpoints
            server.middlewares.use('/api/higgsfield/models', async (req, res) => {
              try {
                const apiKey = req.headers['x-higgsfield-api-key'] as string || env.VITE_HIGGSFIELD_API_KEY || '';
                const secret = req.headers['x-higgsfield-secret'] as string || env.VITE_HIGGSFIELD_SECRET || '';
                
                // Log request details for debugging
                console.log('🔍 [HIGGSFIELD] Models request:', {
                  hasApiKey: !!apiKey,
                  hasSecret: !!secret,
                  keyLength: apiKey?.length || 0,
                  secretLength: secret?.length || 0
                });
                
                const headers: any = { 
                  'Content-Type': 'application/json',
                  'hf-api-key': apiKey,
                  'hf-secret': secret
                };
                
                const r = await fetchWithFallback(
                  'https://platform.higgsfield.ai/v1/models',
                  { headers },
                  'https://cloud.higgsfield.ai/api/v1/models'
                );
                
                const text = await r.text();
                console.log('🔍 [HIGGSFIELD] Models response:', {
                  status: r.status,
                  statusText: r.statusText,
                  responseLength: text.length,
                  isJson: text.startsWith('{') || text.startsWith('[')
                });
                
                res.statusCode = r.status;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.end(text);
              } catch (e: any) {
                console.error('🔴 [HIGGSFIELD] Models error:', e?.message || 'Unknown error');
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'upstream_error', 
                  message: e?.message || 'Proxy error',
                  details: 'Failed to connect to Higgsfield API'
                }));
              }
            });

            // Images/generate proxy - CRITICAL for image generation
            server.middlewares.use('/api/higgsfield/images/generate', async (req, res) => {
              console.log(`🔍 [PROXY] ${req.method} ${req.url} -> https://platform.higgsfield.ai/v1/text2image/soul`);
              try {
                if (req.method !== 'POST') {
                  res.statusCode = 405;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                  return;
                }
                
                const apiKey = req.headers['x-higgsfield-api-key'] as string || '';
                const secret = req.headers['x-higgsfield-secret'] as string || '';
                
                console.log(`🔍 [PROXY] API Key: ${apiKey?.substring(0, 8)}..., Secret: ${secret?.substring(0, 8)}...`);
                
                let requestBody = '';
                req.on('data', chunk => { 
                  requestBody += chunk.toString();
                });
                req.on('end', async () => {
                  try {
                    console.log(`🔍 [PROXY] Request body: ${requestBody}`);
                    
                    // Parse the incoming request body
                    const incomingData = JSON.parse(requestBody);
                    
                    // Transform to the correct Higgsfield API format
                    const higgsfieldBody = {
                      params: {
                        prompt: incomingData.prompt,
                        width_and_height: incomingData.aspect === '16:9' ? '1152x2048' : '1024x1024',
                        enhance_prompt: true,
                        style_id: '464ea177-8d40-4940-8d9d-b438bab269c7', // Default style
                        style_strength: 1,
                        quality: '1080p',
                        seed: 500000,
                        batch_size: 1
                      }
                    };
                    
                    console.log(`🔍 [PROXY] Transformed body: ${JSON.stringify(higgsfieldBody)}`);
                    
                    const r = await fetch('https://platform.higgsfield.ai/v1/text2image/soul', {
                      method: 'POST',
                      headers: { 
                        'hf-api-key': apiKey,
                        'hf-secret': secret,
                        'Content-Type': 'application/json' 
                      },
                      body: JSON.stringify(higgsfieldBody),
                    });
                    
                    const text = await r.text();
                    console.log(`🔍 [PROXY] Response: ${r.status} ${text.substring(0, 100)}...`);
                    
                    res.statusCode = r.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(text);
                  } catch (err: any) {
                    console.error(`🔴 [PROXY] Error:`, err);
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'upstream_error', message: err?.message || 'Proxy error' }));
                  }
                });
              } catch (e: any) {
                console.error(`🔴 [PROXY] Setup error:`, e);
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'upstream_error', message: e?.message || 'Proxy error' }));
              }
            });

            // Other endpoints can be added here if needed

            // Soul Styles endpoint - this actually works!
            server.middlewares.use('/api/higgsfield/soul-styles', async (req, res) => {
              try {
                const apiKey = req.headers['x-higgsfield-api-key'] as string || env.VITE_HIGGSFIELD_API_KEY || '';
                const secret = req.headers['x-higgsfield-secret'] as string || env.VITE_HIGGSFIELD_SECRET || '';
                
                // Log request details for debugging
                console.log('🔍 [HIGGSFIELD] Soul-styles request:', {
                  hasApiKey: !!apiKey,
                  hasSecret: !!secret,
                  keyLength: apiKey?.length || 0,
                  secretLength: secret?.length || 0
                });
                
                const headers: any = { 
                  'Content-Type': 'application/json',
                  'hf-api-key': apiKey,
                  'hf-secret': secret
                };
                
                const r = await fetch('https://platform.higgsfield.ai/v1/text2image/soul-styles', {
                  method: 'GET',
                  headers
                });
                
                const text = await r.text();
                console.log('🔍 [HIGGSFIELD] Soul-styles response:', {
                  status: r.status,
                  statusText: r.statusText,
                  responseLength: text.length,
                  isJson: text.startsWith('{') || text.startsWith('[')
                });
                
                res.statusCode = r.status;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.end(text);
              } catch (e: any) {
                console.error('🔴 [HIGGSFIELD] Soul-styles error:', e?.message || 'Unknown error');
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'upstream_error', 
                  message: e?.message || 'Proxy error',
                  details: 'Failed to connect to Higgsfield API'
                }));
              }
            });

            // Motions endpoint
            server.middlewares.use('/api/higgsfield/motions', async (req, res) => {
              try {
                const apiKey = req.headers['x-higgsfield-api-key'] as string || env.VITE_HIGGSFIELD_API_KEY || '';
                const secret = req.headers['x-higgsfield-secret'] as string || env.VITE_HIGGSFIELD_SECRET || '';
                
                const headers: any = { 
                  'Content-Type': 'application/json',
                  'hf-api-key': apiKey,
                  'hf-secret': secret
                };
                
                const r = await fetch('https://platform.higgsfield.ai/v1/motions', {
                  method: 'GET',
                  headers
                });
                
                const text = await r.text();
                res.statusCode = r.status;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'public, max-age=300');
                res.end(text);
              } catch (e: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'upstream_error', 
                  message: e?.message || 'Proxy error'
                }));
              }
            });

            // Image to Video endpoint
            server.middlewares.use('/api/higgsfield/image2video/generate', async (req, res) => {
              try {
                if (req.method !== 'POST') {
                  res.statusCode = 405;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                  return;
                }
                
                const apiKey = req.headers['x-higgsfield-api-key'] as string || '';
                const secret = req.headers['x-higgsfield-secret'] as string || '';
                
                let requestBody = '';
                req.on('data', chunk => { requestBody += chunk.toString(); });
                req.on('end', async () => {
                  try {
                    // Parse and validate request body has params structure
                    const incomingData = JSON.parse(requestBody);
                    if (!incomingData.params) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'missing_params', message: 'Request body must contain params object' }));
                      return;
                    }

                    const r = await fetch('https://platform.higgsfield.ai/v1/image2video/dop', {
                      method: 'POST',
                      headers: { 
                        'hf-api-key': apiKey,
                        'hf-secret': secret,
                        'Content-Type': 'application/json' 
                      },
                      body: JSON.stringify(incomingData),
                    });
                    
                    const text = await r.text();
                    res.statusCode = r.status;
                    res.setHeader('Content-Type', 'application/json');
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

            // Speech to Video endpoint (Speak v2)
            server.middlewares.use('/api/higgsfield/speech2video/generate', async (req, res) => {
              try {
                if (req.method !== 'POST') {
                  res.statusCode = 405;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                  return;
                }
                
                const apiKey = req.headers['x-higgsfield-api-key'] as string || '';
                const secret = req.headers['x-higgsfield-secret'] as string || '';
                
                let requestBody = '';
                req.on('data', chunk => { requestBody += chunk.toString(); });
                req.on('end', async () => {
                  try {
                    // Parse and validate request body has params structure
                    const incomingData = JSON.parse(requestBody);
                    if (!incomingData.params) {
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'missing_params', message: 'Request body must contain params object' }));
                      return;
                    }

                    const r = await fetch('https://platform.higgsfield.ai/v1/speak/higgsfield', {
                      method: 'POST',
                      headers: { 
                        'hf-api-key': apiKey,
                        'hf-secret': secret,
                        'Content-Type': 'application/json' 
                      },
                      body: JSON.stringify(incomingData),
                    });
                    
                    const text = await r.text();
                    res.statusCode = r.status;
                    res.setHeader('Content-Type', 'application/json');
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

            // Characters management
            server.middlewares.use('/api/higgsfield/characters', async (req, res) => {
              try {
                const apiKey = req.headers['x-higgsfield-api-key'] as string || env.VITE_HIGGSFIELD_API_KEY || '';
                const secret = req.headers['x-higgsfield-secret'] as string || env.VITE_HIGGSFIELD_SECRET || '';
                const headers: any = { 
                  'Content-Type': 'application/json',
                  'hf-api-key': apiKey,
                  'hf-secret': secret
                };
                const method = req.method;
                let body = '';
                if (method === 'POST' || method === 'PUT') {
                  req.on('data', chunk => { body += chunk; });
                  req.on('end', async () => {
                    try {
                      const r = await fetchWithFallback(
                        'https://platform.higgsfield.ai/v1/characters',
                        { method, headers, body },
                        'https://cloud.higgsfield.ai/api/v1/characters'
                      );
                      const text = await r.text();
                      res.statusCode = r.status;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(text);
                    } catch (err: any) {
                      res.statusCode = 502;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'upstream_error', message: err?.message || 'Proxy error' }));
                    }
                  });
                } else {
                  const r = await fetchWithFallback(
                    'https://platform.higgsfield.ai/v1/characters',
                    { method, headers },
                    'https://cloud.higgsfield.ai/api/v1/characters'
                  );
                  const text = await r.text();
                  res.statusCode = r.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(text);
                }
              } catch (e: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'upstream_error', message: e?.message || 'Proxy error' }));
              }
            });

            server.middlewares.use('/api/higgsfield/videos/', async (req, res) => {
              try {
                const url = req.url || '';
                const match = url.match(/^\/api\/higgsfield\/videos\/(.+)/);
                if (!match) { res.statusCode = 404; res.end('Not Found'); return; }
                const videoId = match[1];
                const apiKey = req.headers['x-higgsfield-api-key'] as string || env.VITE_HIGGSFIELD_API_KEY || '';
                const secret = req.headers['x-higgsfield-secret'] as string || env.VITE_HIGGSFIELD_SECRET || '';
                const headers: any = { 
                  'hf-api-key': apiKey,
                  'hf-secret': secret
                };
                const r = await fetchWithFallback(
                  `https://platform.higgsfield.ai/v1/videos/${videoId}`,
                  { headers },
                  `https://cloud.higgsfield.ai/api/v1/videos/${videoId}`
                );
                const text = await r.text();
                res.statusCode = r.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(text);
              } catch (e: any) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'upstream_error', message: e?.message || 'Proxy error' }));
              }
            });

            // Add catch-all for debugging (moved to end) - DISABLED to allow proxy middleware to work
            // server.middlewares.use((req, res, next) => {
            //   if (req.url?.startsWith('/api/')) {
            //     console.log(`🔍 [API] Unhandled API route: ${req.method} ${req.url}`);
            //     res.statusCode = 404;
            //     res.setHeader('Content-Type', 'application/json');
            //     res.end(JSON.stringify({ error: 'unidentified route' }));
            //     return;
            //   }
            //   next();
            // });
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
