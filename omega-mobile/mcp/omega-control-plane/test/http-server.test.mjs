import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHttpApp } from '../src/http-server.mjs';

async function withServer(options, fn) {
  const app = createHttpApp(options);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('health and RFC 9728 metadata are public', async () => {
  const env = {
    NODE_ENV: 'test',
    OMEGA_AUTH_MODE: 'none',
    OMEGA_OAUTH_ISSUER: 'https://auth.example.test',
    OMEGA_OAUTH_SCOPES: 'omega.mcp'
  };
  await withServer({ env }, async (base) => {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).version, '4.3.2');
    const meta = await fetch(`${base}/.well-known/oauth-protected-resource`);
    assert.equal(meta.status, 200);
    const doc = await meta.json();
    assert.equal(doc.resource, `${base}/mcp`);
    assert.deepEqual(doc.authorization_servers, ['https://auth.example.test']);
    assert.deepEqual(doc.scopes_supported, ['omega.mcp']);
  });
});

test('OAuth gate rejects unauthenticated MCP requests and passes verified callers', async () => {
  const env = {
    NODE_ENV: 'test',
    OMEGA_AUTH_MODE: 'jwt',
    OMEGA_OAUTH_ISSUER: 'https://auth.example.test',
    OMEGA_OAUTH_AUDIENCE: 'https://omega.example.test/mcp',
    OMEGA_OAUTH_SCOPES: 'omega.mcp'
  };
  const verifier = {
    async verifyAccessToken(token) {
      assert.equal(token, 'good-token');
      return { token, clientId: 'test-client', scopes: ['omega.mcp'], expiresAt: Math.floor(Date.now() / 1000) + 300 };
    }
  };
  await withServer({ env, verifier }, async (base) => {
    const denied = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    assert.equal(denied.status, 401);
    assert.match(denied.headers.get('www-authenticate') ?? '', /oauth-protected-resource/);

    const allowed = await fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer good-token',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': 'tools/list'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {}
          }
        }
      })
    });
    assert.equal(allowed.status, 200);
    const text = await allowed.text();
    assert.match(text, /omega_gateway_info/);
    assert.match(text, /omega_capabilities/);
  });
});
