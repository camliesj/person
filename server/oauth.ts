export interface Env { SITE_URL?: string; GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string }
export interface Context { request: Request; env: Env }
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export const OWNER = 'camliesj';
export const REPOSITORY = 'camliesj/person';
const COOKIE = '__Host-person-oauth-state';
const cookieOptions = 'Path=/; HttpOnly; Secure; SameSite=Lax';
const noStore = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };

export function configuredOrigin(env: Env): string | null {
  if (!env.SITE_URL || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
  try {
    const url = new URL(env.SITE_URL);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.origin : null;
  } catch { return null; }
}
function scriptJson(value: unknown) { return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026'); }

export function authResult(origin: string, payload: { token: string; provider: string } | { message: string }, status = 200): Response {
  const success = 'token' in payload;
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const result = `authorization:github:${success ? 'success' : 'error'}:${JSON.stringify(payload)}`;
  // Decap's handshake must complete before returning its authentication result.
  const script = `const origin=${scriptJson(origin)};const result=${scriptJson(result)};const openerWindow=window.opener;function receive(event){if(event.origin!==origin||event.source!==openerWindow||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);openerWindow.postMessage(result,origin);}if(openerWindow){window.addEventListener('message',receive);openerWindow.postMessage('authorizing:github',origin);}`;
  const text = success ? '登录成功，正在返回内容后台。' : ('message' in payload ? payload.message : '登录未完成。');
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>后台登录 — 日常之间</title></head><body><main><h1>${success ? '欢迎回来' : '暂时无法登录'}</h1><p>${escaped}</p><p>如果窗口没有自动关闭，请返回后台重试。</p><a href="/admin/">返回内容后台</a></main><script nonce="${nonce}">${script}</script></body></html>`, {
    status,
    headers: { ...noStore, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': `${COOKIE}=; ${cookieOptions}; Max-Age=0`,
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` },
  });
}
function error(origin: string, message: string, status = 400) { return authResult(origin, { message }, status); }
function originError(request: Request, env: Env): Response | null {
  const origin = configuredOrigin(env);
  if (!origin) return error(new URL(request.url).origin, '后台登录尚未配置。请先完成网站的 GitHub OAuth 设置。', 503);
  if (new URL(request.url).origin !== origin) return error(new URL(request.url).origin, '请从正式网站的内容后台登录，预览地址不提供登录服务。', 403);
  return null;
}

export function startAuth(request: Request, env: Env): Response {
  const unavailable = originError(request, env); if (unavailable) return unavailable;
  const origin = configuredOrigin(env)!;
  const input = new URL(request.url);
  if (input.searchParams.get('provider') !== 'github') return error(origin, '仅支持使用 GitHub 账号登录。');
  const siteId = input.searchParams.get('site_id');
  if (siteId && siteId !== new URL(origin).host) return error(origin, '登录来源不匹配，请从本站后台重试。', 403);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
  const destination = new URL('https://github.com/login/oauth/authorize');
  destination.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID!, redirect_uri: `${origin}/api/auth/callback`, scope: 'public_repo', state, login: OWNER }).toString();
  return new Response(null, { status: 302, headers: { ...noStore, Location: destination.href, 'Set-Cookie': `${COOKIE}=${state}; ${cookieOptions}; Max-Age=600` } });
}

export async function finishAuth(request: Request, env: Env, fetcher: Fetcher = fetch): Promise<Response> {
  const unavailable = originError(request, env); if (unavailable) return unavailable;
  const origin = configuredOrigin(env)!;
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const cookies = (request.headers.get('Cookie') || '').split(';').map((part) => part.trim());
  const expected = cookies.find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!state || !expected || !/^[a-f0-9]{64}$/.test(state) || state !== expected) return error(origin, '登录已过期或校验失败，请关闭此窗口后重新登录。', 403);
  if (url.searchParams.has('error')) return error(origin, '你取消了 GitHub 授权，可以返回后台重新登录。');
  const code = url.searchParams.get('code');
  if (!code || code.length > 1024) return error(origin, '没有收到有效的授权结果，请重试。');
  try {
    const tokenResponse = await fetcher('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${origin}/api/auth/callback` }),
    });
    if (!tokenResponse.ok) return error(origin, 'GitHub 暂时无法完成登录，请稍后重试。', 502);
    const token = await tokenResponse.json() as { access_token?: string; error?: string };
    if (token.error || typeof token.access_token !== 'string' || !token.access_token) return error(origin, '授权码已失效，请重新登录。', 401);
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'person-journal-cms' };
    const userResponse = await fetcher('https://api.github.com/user', { headers, signal: AbortSignal.timeout(10000) });
    if (!userResponse.ok) return error(origin, '无法核实 GitHub 账号，请重新登录。', 401);
    const user = await userResponse.json() as { login?: string };
    if (user.login?.toLowerCase() !== OWNER) return error(origin, '此后台仅允许 camliesj 登录。请切换 GitHub 账号后重试。', 403);
    const repoResponse = await fetcher(`https://api.github.com/repos/${REPOSITORY}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!repoResponse.ok) return error(origin, '无法读取目标仓库，请确认仓库和授权状态。', 403);
    const repo = await repoResponse.json() as { permissions?: { push?: boolean } };
    if (!repo.permissions?.push) return error(origin, '当前账号没有目标仓库的写入权限。', 403);
    return authResult(origin, { token: token.access_token, provider: 'github' });
  } catch { return error(origin, '网络连接暂时失败。你的内容没有更改，请稍后重试。', 502); }
}

export function authStatus(request: Request, env: Env): Response {
  const origin = configuredOrigin(env);
  return Response.json({ configured: Boolean(origin && new URL(request.url).origin === origin) }, { headers: noStore });
}
