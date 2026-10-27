import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { startAuth, finishAuth, authStatus, configuredOrigin, authResult } from '../server/oauth.ts';
const env = { SITE_URL: 'https://journal.example', GITHUB_CLIENT_ID: 'test-client', GITHUB_CLIENT_SECRET: 'test-secret' };
const state = 'a'.repeat(64);
function callback(query = `code=abc&state=${state}`, cookie = state) {
  return new Request(`${env.SITE_URL}/api/auth/callback?${query}`, { headers: cookie ? { Cookie: `__Host-person-oauth-state=${cookie}` } : {} });
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
test('missing credentials and non-HTTPS origins fail closed', () => {
  assert.equal(configuredOrigin({}), null);
  assert.equal(configuredOrigin({ ...env, SITE_URL: 'http://journal.example' }), null);
  assert.equal(configuredOrigin({ ...env, SITE_URL: 'https://user@journal.example' }), null);
  assert.equal(startAuth(new Request('https://journal.example/api/auth?provider=github'), {}).status, 503);
});
test('start creates a secure bound state and does not honor injected scope or redirect', () => {
  const result = startAuth(new Request('https://journal.example/api/auth?provider=github&scope=repo&redirect_uri=https://evil.example'), env);
  assert.equal(result.status, 302);
  const url = new URL(result.headers.get('Location')!);
  assert.equal(url.origin, 'https://github.com'); assert.equal(url.searchParams.get('scope'), 'public_repo');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://journal.example/api/auth/callback');
  assert.match(url.searchParams.get('state')!, /^[a-f0-9]{64}$/);
  const cookie = result.headers.get('Set-Cookie')!;
  assert.ok(cookie.includes(url.searchParams.get('state')!));
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
});
test('wrong origin, unsupported provider and mismatched site are rejected', () => {
  assert.equal(startAuth(new Request('https://preview.example/api/auth?provider=github'), env).status, 403);
  assert.equal(startAuth(new Request('https://journal.example/api/auth?provider=gitlab'), env).status, 400);
  assert.equal(startAuth(new Request('https://journal.example/api/auth?provider=github&site_id=evil.example'), env).status, 403);
});
test('missing or mismatched state never contacts GitHub', async () => {
  const noFetch = async () => { throw new Error('Must not fetch'); };
  for (const req of [callback('code=a', ''), callback(`code=a&state=${'b'.repeat(64)}`), callback(`code=a&state=${state}`, '')]) {
    assert.equal((await finishAuth(req, env, noFetch)).status, 403);
  }
});
test('cancelled authorization returns a readable error and clears state', async () => {
  const res = await finishAuth(callback(`error=access_denied&state=${state}`), env);
  assert.equal(res.status, 400); assert.match(await res.text(), /取消了 GitHub 授权/);
  assert.match(res.headers.get('Set-Cookie')!, /Max-Age=0/);
});
test('another GitHub user cannot receive a token', async () => {
  let calls = 0;
  const res = await finishAuth(callback(), env, async () => ++calls === 1 ? response({ access_token: 'never-expose-this' }) : response({ login: 'someone-else' }));
  assert.equal(res.status, 403); assert.equal(calls, 2); assert.ok(!(await res.text()).includes('never-expose-this'));
});
test('owner without repository write access cannot receive a token', async () => {
  let calls = 0;
  const results = [{ access_token: 'never-expose-this' }, { login: 'camliesj' }, { permissions: { push: false } }];
  const res = await finishAuth(callback(), env, async () => response(results[calls++]));
  assert.equal(res.status, 403); assert.ok(!(await res.text()).includes('never-expose-this'));
});
test('owner with write access receives Decap handshake restricted to opener and exact origin', async () => {
  const urls: string[] = [];
  const results = [{ access_token: 'test-access-token' }, { login: 'camliesj' }, { permissions: { push: true } }];
  const res = await finishAuth(callback(), env, async (url) => { urls.push(String(url)); return response(results[urls.length - 1]); });
  assert.equal(res.status, 200); const html = await res.text();
  assert.match(html, /authorization:github:success/); assert.match(html, /event.source!==openerWindow/); assert.match(html, /event.origin!==origin/);
  assert.ok(!html.includes('test-secret')); assert.match(res.headers.get('Cache-Control')!, /no-store/);
  assert.match(res.headers.get('Content-Security-Policy')!, /frame-ancestors 'none'/);
  assert.equal(urls[2], 'https://api.github.com/repos/camliesj/person');
});
test('upstream failures and missing tokens return safe errors', async () => {
  assert.equal((await finishAuth(callback(), env, async () => response({}, 500))).status, 502);
  assert.equal((await finishAuth(callback(), env, async () => response({ error: 'bad_verification_code' }))).status, 401);
  const res = await finishAuth(callback(), env, async () => { throw new Error('sensitive server detail'); });
  assert.equal(res.status, 502); assert.ok(!(await res.text()).includes('sensitive server detail'));
});
test('callback payload cannot break out of its script element', async () => {
  const html = await authResult(env.SITE_URL, { message: '</script><script>alert(1)</script>' }).text();
  assert.ok(!html.includes('</script><script>')); assert.ok(html.includes('\\u003c'));
});
test('browser handshake ignores forged messages and delivers the result only to its opener', async () => {
  const html = await authResult(env.SITE_URL, { token: 'example-token', provider: 'github' }).text();
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)![1];
  const messages: { data: string; origin: string }[] = [];
  const listeners = new Map<string, (event: { origin: string; source: unknown; data: string }) => void>();
  const opener = { postMessage: (data: string, origin: string) => messages.push({ data, origin }) };
  runInNewContext(script, { window: {
    opener,
    addEventListener: (event: string, handler: (event: { origin: string; source: unknown; data: string }) => void) => listeners.set(event, handler),
    removeEventListener: (event: string) => listeners.delete(event),
  } });
  assert.deepEqual(messages, [{ data: 'authorizing:github', origin: env.SITE_URL }]);
  const receive = listeners.get('message')!;
  receive({ origin: 'https://untrusted.example', source: opener, data: 'authorizing:github' });
  receive({ origin: env.SITE_URL, source: {}, data: 'authorizing:github' });
  receive({ origin: env.SITE_URL, source: opener, data: 'wrong handshake' });
  assert.equal(messages.length, 1);
  receive({ origin: env.SITE_URL, source: opener, data: 'authorizing:github' });
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[1], { data: 'authorization:github:success:{"token":"example-token","provider":"github"}', origin: env.SITE_URL });
  assert.equal(listeners.size, 0);
});
test('status exposes only configuration availability on the expected host', async () => {
  assert.deepEqual(await authStatus(new Request(`${env.SITE_URL}/api/auth/status`), env).json(), { configured: true });
  assert.deepEqual(await authStatus(new Request('https://preview.example/api/auth/status'), env).json(), { configured: false });
});
