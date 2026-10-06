import { OAuthError, OAuthErrorCode } from '@modelcontextprotocol/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const discoveryCache = new Map();

function invalid(message) {
  throw new OAuthError(OAuthErrorCode.InvalidToken, message);
}

function normalizeScopes(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  return [];
}

function discoveryUrls(issuer) {
  const source = new URL(issuer);
  const issuerPath = source.pathname.replace(/^\/+|\/+$/g, '');
  const oidc = new URL(source.origin);
  oidc.pathname = issuerPath ? `/.well-known/openid-configuration/${issuerPath}` : '/.well-known/openid-configuration';
  const oauth = new URL(source.origin);
  oauth.pathname = issuerPath ? `/.well-known/oauth-authorization-server/${issuerPath}` : '/.well-known/oauth-authorization-server';
  return [oidc, oauth];
}

async function discoverIssuer(issuer, fetchFn = fetch) {
  if (discoveryCache.has(issuer)) return discoveryCache.get(issuer);
  const failures = [];
  for (const url of discoveryUrls(issuer)) {
    const res = await fetchFn(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      failures.push(`${url.pathname}:HTTP ${res.status}`);
      continue;
    }
    const doc = await res.json();
    if (doc.issuer !== issuer) {
      failures.push(`${url.pathname}:issuer mismatch`);
      continue;
    }
    if (!doc.jwks_uri) {
      failures.push(`${url.pathname}:missing jwks_uri`);
      continue;
    }
    discoveryCache.set(issuer, doc);
    return doc;
  }
  throw new Error(`OAuth/OIDC discovery failed (${failures.join(', ')})`);
}

function clientIdFromPayload(payload) {
  const candidates = [payload.client_id, payload.azp, payload.sub];
  for (const value of candidates) if (typeof value === 'string' && value) return value;
  return 'oauth-client';
}

export function createJwtVerifier({ issuer, audience, jwksUri, fetchFn = fetch } = {}) {
  if (!issuer) throw new Error('OMEGA_OAUTH_ISSUER is required for jwt auth');
  if (!audience) throw new Error('OMEGA_OAUTH_AUDIENCE is required for jwt auth');
  let jwks;
  return {
    async verifyAccessToken(token) {
      try {
        const resolvedJwks = jwksUri ?? (await discoverIssuer(issuer, fetchFn)).jwks_uri;
        jwks ??= createRemoteJWKSet(new URL(resolvedJwks));
        const { payload } = await jwtVerify(token, jwks, { issuer, audience });
        if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) invalid('token expired');
        const scopes = normalizeScopes(payload.scope ?? payload.scp);
        return {
          token,
          clientId: clientIdFromPayload(payload),
          scopes,
          expiresAt: payload.exp
        };
      } catch (error) {
        if (error instanceof OAuthError) throw error;
        invalid(error instanceof Error ? error.message : 'invalid access token');
      }
    }
  };
}

export function createIntrospectionVerifier({ url, clientId, clientSecret, audience, fetchFn = fetch } = {}) {
  if (!url || !clientId || !clientSecret) throw new Error('introspection auth requires URL, client id and client secret');
  return {
    async verifyAccessToken(token) {
      const body = new URLSearchParams({ token, token_type_hint: 'access_token' });
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await fetchFn(url, {
        method: 'POST',
        headers: {
          authorization: `Basic ${auth}`,
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json'
        },
        body
      });
      if (!res.ok) invalid(`token introspection failed: HTTP ${res.status}`);
      const doc = await res.json();
      if (!doc.active) invalid('inactive access token');
      if (!doc.exp || Number(doc.exp) <= Math.floor(Date.now() / 1000)) invalid('token expired');
      if (audience) {
        const values = Array.isArray(doc.aud) ? doc.aud : doc.aud ? [doc.aud] : [];
        if (!values.includes(audience)) invalid('token audience mismatch');
      }
      return {
        token,
        clientId: String(doc.client_id ?? doc.sub ?? 'oauth-client'),
        scopes: normalizeScopes(doc.scope ?? doc.scp),
        expiresAt: Number(doc.exp)
      };
    }
  };
}

export function createConfiguredVerifier(env = process.env) {
  const mode = (env.OMEGA_AUTH_MODE ?? 'jwt').toLowerCase();
  if (mode === 'jwt') {
    return createJwtVerifier({
      issuer: env.OMEGA_OAUTH_ISSUER,
      audience: env.OMEGA_OAUTH_AUDIENCE,
      jwksUri: env.OMEGA_OAUTH_JWKS_URI
    });
  }
  if (mode === 'introspection') {
    return createIntrospectionVerifier({
      url: env.OMEGA_OAUTH_INTROSPECTION_URL,
      clientId: env.OMEGA_OAUTH_INTROSPECTION_CLIENT_ID,
      clientSecret: env.OMEGA_OAUTH_INTROSPECTION_CLIENT_SECRET,
      audience: env.OMEGA_OAUTH_AUDIENCE
    });
  }
  throw new Error(`Unsupported OMEGA_AUTH_MODE: ${mode}`);
}
