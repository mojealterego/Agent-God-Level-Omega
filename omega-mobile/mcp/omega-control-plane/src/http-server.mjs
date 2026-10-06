import { pathToFileURL } from 'node:url';
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { createServer as createOmegaServer } from './server.mjs';
import { createConfiguredVerifier } from './auth/oidc-verifier.mjs';

function splitList(value) {
  return String(value ?? '').split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
}

function requestBaseUrl(req, env) {
  if (env.OMEGA_PUBLIC_BASE_URL) return env.OMEGA_PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] ?? req.protocol ?? 'https').split(',')[0].trim();
  const host = req.get('host');
  return `${proto}://${host}`;
}

function challenge(req, env, code = 'invalid_token', description = 'Authentication required') {
  const base = requestBaseUrl(req, env);
  const metadata = `${base}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${metadata}", error="${code}", error_description="${description.replace(/"/g, "'")}"`;
}

function jsonError(res, status, code, description, header) {
  res.set('cache-control', 'no-store');
  if (header) res.set('www-authenticate', header);
  return res.status(status).json({ error: code, error_description: description });
}

function authMiddleware({ env, verifier, requiredScopes }) {
  return async (req, res, next) => {
    const value = req.get('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(value);
    if (!match) return jsonError(res, 401, 'invalid_token', 'Bearer access token required', challenge(req, env));
    try {
      const authInfo = await verifier.verifyAccessToken(match[1]);
      const granted = new Set(authInfo.scopes ?? []);
      const missing = requiredScopes.filter((scope) => !granted.has(scope));
      if (missing.length) {
        return jsonError(
          res,
          403,
          'insufficient_scope',
          `Required scope missing: ${missing.join(' ')}`,
          challenge(req, env, 'insufficient_scope', `Required scope: ${missing.join(' ')}`)
        );
      }
      req.auth = authInfo;
      return next();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Invalid access token';
      const code = error instanceof OAuthError ? error.code : OAuthErrorCode.InvalidToken;
      return jsonError(res, 401, code || 'invalid_token', description, challenge(req, env, 'invalid_token', description));
    }
  };
}

export function createHttpApp({ env = process.env, verifier } = {}) {
  const authMode = String(env.OMEGA_AUTH_MODE ?? (env.NODE_ENV === 'test' ? 'none' : 'jwt')).toLowerCase();
  const allowInsecure = env.NODE_ENV === 'test' || env.OMEGA_ALLOW_INSECURE_AUTH === '1';
  if (authMode === 'none' && !allowInsecure) {
    throw new Error('OMEGA_AUTH_MODE=none is forbidden outside tests unless OMEGA_ALLOW_INSECURE_AUTH=1');
  }
  const requiredScopes = splitList(env.OMEGA_OAUTH_SCOPES || 'omega.mcp');
  const allowedHosts = splitList(env.OMEGA_ALLOWED_HOSTS);
  const allowedOrigins = splitList(env.OMEGA_ALLOWED_ORIGINS);
  const app = createMcpExpressApp({
    host: '0.0.0.0',
    allowedHosts: allowedHosts.length ? allowedHosts : undefined,
    allowedOrigins: allowedOrigins.length ? allowedOrigins : undefined,
    jsonLimit: env.OMEGA_MCP_JSON_LIMIT || '2mb'
  });
  app.set('trust proxy', true);

  app.get('/healthz', (_req, res) => res.status(200).json({ ok: true, service: 'omega-remote-mcp', version: '4.3.2' }));
  app.get('/readyz', (_req, res) => {
    const authConfigured = authMode === 'none' || Boolean(env.OMEGA_OAUTH_ISSUER && env.OMEGA_OAUTH_AUDIENCE);
    res.status(authConfigured ? 200 : 503).json({ ok: authConfigured, auth_mode: authMode, version: '4.3.2' });
  });

  const metadataHandler = (req, res) => {
    const base = requestBaseUrl(req, env);
    const resource = `${base}/mcp`;
    const issuer = env.OMEGA_OAUTH_ISSUER;
    const doc = {
      resource,
      authorization_servers: issuer ? [issuer] : [],
      scopes_supported: requiredScopes,
      resource_name: 'OMEGA Remote MCP',
      resource_documentation: `${base}/docs/mcp`
    };
    res.set('cache-control', 'public, max-age=300').status(200).json(doc);
  };
  app.get('/.well-known/oauth-protected-resource', metadataHandler);
  app.get('/.well-known/oauth-protected-resource/mcp', metadataHandler);
  app.get('/docs/mcp', (_req, res) => res.status(200).type('text/plain').send('OMEGA Remote MCP v4.3.2 — Streamable HTTP endpoint: /mcp'));

  const handler = createMcpHandler((ctx) => createOmegaServer({
    transport: 'remote-http',
    authInfo: ctx.authInfo ?? null
  }));
  const node = toNodeHandler(handler);
  const middleware = authMode === 'none' ? (_req, _res, next) => next() : authMiddleware({
    env,
    verifier: verifier ?? createConfiguredVerifier(env),
    requiredScopes
  });
  app.all('/mcp', middleware, (req, res) => void node(req, res, req.body));
  return app;
}

export function startHttpServer({ env = process.env } = {}) {
  const port = Number(env.PORT || 8080);
  const app = createHttpApp({ env });
  const server = app.listen(port, '0.0.0.0', () => {
    console.error(`OMEGA Remote MCP v4.3.2 listening on 0.0.0.0:${port}/mcp`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startHttpServer();
}
