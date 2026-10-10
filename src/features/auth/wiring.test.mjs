import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
function load(path, dependencies) {
  if (!existsSync(path)) return {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; }, process: { env: { SUPABASE_SECRET_KEY: 'test-secret' } }, URL, Headers, console });
  return exports;
}
const success = { ok: true, value: undefined };
const failure = { ok: false, kind: 'authentication', message: 'Incorrect email, username, or password.' };
function login({ email = 'private@example.com', allowed = true, result = success } = {}) {
  const calls = [];
  const exports = load('src/features/auth/actions.ts', {
    'next/headers': { headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }) },
    '../../lib/supabase/server': { getServerSupabase: async () => ({}) },
    '../../lib/supabase/admin': { getAdminSupabase: () => ({}) },
    '../../lib/config/env': { readSupabaseSecretKey: () => 'test-secret' },
    'node:crypto': { randomUUID: () => 'test-uuid' },
    './schemas': { parseIdentifier: value => value === 'maria' ? { kind: 'username', username: value } : value.includes('@') ? { kind: 'email', email: value } : null },
    './repository': { hashIp: () => 'hash', countRecentFailures: async () => ({ username: 0, ip: 0 }), attemptAllowed: () => allowed, findEmailByUsername: async () => email, recordFailure: async () => calls.push('failure') },
    './service': { GENERIC_LOGIN_FAILURE: failure.message, signInWithEmail: async (_, input) => { calls.push(input); return result; }, toFailure: () => failure },
  });
  return { exports, calls };
}
test('username login resolves email only on the server and returns no email or token', async () => {
  const { exports, calls } = login(); assert.equal(typeof exports.loginWithIdentifier, 'function');
  const result = await exports.loginWithIdentifier({ identifier: 'maria', password: 'abc12345x' });
  assert.deepEqual(result, success); assert.equal(calls[0].email, 'private@example.com');
  assert.equal(JSON.stringify(result).includes('private@example.com'), false);
});
test('username limiter rejects login before looking up/signing in', async () => {
  const { exports, calls } = login({ allowed: false }); assert.equal(typeof exports.loginWithIdentifier, 'function');
  const result = await exports.loginWithIdentifier({ identifier: 'maria', password: 'abc12345x' });
  assert.equal(result.ok, false); assert.equal(result.kind, 'rate-limit'); assert.equal(calls.length, 0);
});
test('unknown username produces generic credentials failure and records a failed attempt', async () => {
  const { exports, calls } = login({ email: null }); assert.equal(typeof exports.loginWithIdentifier, 'function');
  const result = await exports.loginWithIdentifier({ identifier: 'maria', password: 'abc12345x' });
  assert.equal(result.message, failure.message);
  // A sign-in still happens, against an address that cannot exist, so timing does not reveal the username.
  assert.equal(calls.length, 2);
  assert.match(calls[0].email, /^unknown-test-uuid@wattsnap\.invalid$/);
  assert.equal(calls[0].password, 'abc12345x');
  assert.equal(calls[1], 'failure');
});
test('an unknown username is refused even if the placeholder sign-in were to succeed', async () => {
  const { exports } = login({ email: null, result: success });
  const result = await exports.loginWithIdentifier({ identifier: 'maria', password: 'abc12345x' });
  // The action's result is built in another realm, so compare its contents.
  assert.deepEqual(JSON.parse(JSON.stringify(result)), failure);
});
test('an email sent to the server action is refused without any sign-in or lookup', async () => {
  const { exports, calls } = login();
  const result = await exports.loginWithIdentifier({ identifier: 'maria@gmail.com', password: 'abc12345x' });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), failure); assert.deepEqual(calls, []);
});
function route(path, auth, profile = { onboardedAt: 'date' }, signedIn = true) {
  return load(path, {
    'next/server': { NextResponse: { redirect: url => new Response(null, { status: 307, headers: { location: String(url) } }) } },
    '../../../lib/supabase/server': { getServerSupabase: async () => ({ auth }) },
    '../../../features/auth/schemas': { safeNextPath: value => value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/dashboard' },
    '../../../features/auth/service': { getAccount: async () => ({ ok: true, value: signedIn ? { profile } : null }) },
  });
}
test('Back to a used Google sign-in link keeps an open session instead of showing an error', async () => {
  const used = { exchangeCodeForSession: async () => ({ error: { code: 'flow_state_not_found' } }) };
  const kept = await route('src/app/auth/callback/route.ts', used).GET(new Request('https://wattsnap.test/auth/callback?code=used&next=/bills'));
  assert.equal(new URL(kept.headers.get('location')).pathname, '/bills');
  const signedOut = await route('src/app/auth/callback/route.ts', used, undefined, false).GET(new Request('https://wattsnap.test/auth/callback?code=used'));
  assert.equal(new URL(signedOut.headers.get('location')).search, '?error=callback');
  const reset = await route('src/app/auth/callback/route.ts', used).GET(new Request('https://wattsnap.test/auth/callback?code=used&next=/reset-password'));
  assert.equal(new URL(reset.headers.get('location')).pathname, '/login', 'a used code never opens the password reset');
});
test('Back to a used email link keeps an open session, but never for a password reset', async () => {
  const used = { verifyOtp: async () => ({ error: { code: 'otp_expired' } }) };
  const kept = await route('src/app/auth/confirm/route.ts', used).GET(new Request('https://wattsnap.test/auth/confirm?token_hash=old&type=signup'));
  assert.equal(new URL(kept.headers.get('location')).pathname, '/dashboard');
  const reset = await route('src/app/auth/confirm/route.ts', used).GET(new Request('https://wattsnap.test/auth/confirm?token_hash=old&type=recovery'));
  assert.equal(new URL(reset.headers.get('location')).search, '?error=verification');
});
test('OAuth callback exchanges code and rejects an external next redirect', async () => {
  let exchanged;
  const exports = route('src/app/auth/callback/route.ts', { exchangeCodeForSession: async code => { exchanged = code; return { error: null }; } });
  assert.equal(typeof exports.GET, 'function');
  const response = await exports.GET(new Request('https://wattsnap.test/auth/callback?code=abc&next=//evil.test'));
  assert.equal(exchanged, 'abc'); assert.equal(response.headers.get('location'), 'https://wattsnap.test/dashboard');
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('recovery email links verify their signed token hash before redirecting to reset', async () => {
  let received;
  const exports = route('src/app/auth/confirm/route.ts', { verifyOtp: async input => { received = input; return { error: null }; } });
  assert.equal(typeof exports.GET, 'function');
  const response = await exports.GET(new Request('https://wattsnap.test/auth/confirm?token_hash=hash&type=recovery'));
  assert.deepEqual(JSON.parse(JSON.stringify(received)), { token_hash: 'hash', type: 'recovery' });
  assert.equal(response.headers.get('location'), 'https://wattsnap.test/reset-password');
});
test('PKCE recovery links allow password reset before profile onboarding', async () => {
  const exports = route('src/app/auth/callback/route.ts', { exchangeCodeForSession: async () => ({ error: null }) }, { onboardedAt: null });
  const response = await exports.GET(new Request('https://wattsnap.test/auth/callback?code=abc&next=/reset-password'));
  assert.equal(new URL(response.headers.get('location')).pathname, '/reset-password');
});
test('unsupported OTP link type never invokes Supabase verification', async () => {
  let calls = 0;
  const exports = route('src/app/auth/confirm/route.ts', { verifyOtp: async () => { calls++; return { error: null }; } });
  assert.equal(typeof exports.GET, 'function');
  const response = await exports.GET(new Request('https://wattsnap.test/auth/confirm?token_hash=hash&type=sms&next=//evil.test'));
  assert.equal(calls, 0); assert.equal(new URL(response.headers.get('location')).pathname, '/login');
});
test('middleware copies refreshed cookies onto denied-route redirects and disables caching', async () => {
  function response(location) {
    const cookies = [];
    return { headers: new Headers(location ? { location } : {}), cookies: { set: (...args) => cookies.push(args), getAll: () => cookies.map(args => typeof args[0] === 'string' ? { name: args[0], value: args[1] } : args[0]) } };
  }
  const requestCookies = [];
  const url = new URL('https://wattsnap.test/bills/new?month=10');
  url.clone = () => new URL(url);
  const exports = load('src/lib/supabase/middleware.ts', {
    '@supabase/ssr': { createServerClient: (_, __, options) => { options.cookies.setAll([{ name: 'sb-session', value: 'refreshed', options: { httpOnly: true } }], { 'Cache-Control': 'private' }); return {}; } },
    'next/server': { NextResponse: { next: () => response(), redirect: url => response(String(url)) } },
    '../config/env': { readPublicSupabaseEnv: () => ({ url: 'https://project.test', publishableKey: 'public' }) },
    './authorization': { hasVerifiedClaims: async () => false, isProtectedPath: () => true },
  });
  const result = await exports.updateSession({ nextUrl: url, cookies: { getAll: () => [], set: (...args) => requestCookies.push(args) } });
  assert.equal(result.cookies.getAll()[0].value, 'refreshed');
  assert.equal(requestCookies[0][1], 'refreshed');
  assert.equal(new URL(result.headers.get('location')).pathname, '/login');
  assert.equal(new URL(result.headers.get('location')).searchParams.get('next'), '/bills/new?month=10');
  assert.match(result.headers.get('cache-control'), /private.*no-store/);
});
test('disabled Google provider produces a visible availability failure before OAuth redirects', async () => {
  const dependencies = {
    'next/headers': {}, '../../lib/supabase/server': {}, '../../lib/supabase/admin': {},
    '../../lib/config/env': { readPublicSupabaseEnv: () => ({ url: 'https://project.test', publishableKey: 'public' }) },
    './schemas': {}, './repository': {}, './service': { toFailure: () => failure },
  };
  const code = ts.transpileModule(readFileSync('src/features/auth/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => dependencies[name], fetch: async () => ({ ok: true, json: async () => ({ external: { google: false } }) }), AbortSignal, URL });
  assert.equal(typeof exports.checkGoogleProvider, 'function');
  const result = await exports.checkGoogleProvider();
  assert.equal(result.ok, false);
  assert.match(result.message, /Google.*not available/i);
});
