import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const session = await import('./session.ts').catch(() => ({}));
const preview = await import('./preview-session.ts');
const account = id => ({ id, email: 'maria@example.com', profile: { fullName: 'Maria Santos', username: 'maria', avatarPath: null, onboardedAt: '2026-10-11', notifications: { brownouts: true, billReminders: true, tips: true } } });
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = { dispatchEvent() {} };
test('forged persisted preview identity cannot choose a signed-in storage identity', () => {
  values.set(preview.previewSessionKey, JSON.stringify({ version: 1, identity: { id: 'maria@example.com', name: 'Forged', email: 'maria@example.com' } }));
  assert.equal(preview.readPreviewIdentity(), null);
});
test('verified account ID replaces the old display identity and contains no session credentials', () => {
  assert.equal(typeof session.rememberAccount, 'function');
  session.rememberAccount(account('11111111-1111-4111-8111-111111111111'));
  assert.equal(preview.readPreviewIdentity().id, '11111111-1111-4111-8111-111111111111');
  session.rememberAccount(account('22222222-2222-4222-8222-222222222222'));
  assert.equal(preview.readPreviewIdentity().id, '22222222-2222-4222-8222-222222222222');
  assert.equal(JSON.stringify([...values]).includes('11111111-1111-4111-8111-111111111111'), false);
  assert.equal(JSON.stringify([...values]).includes('access_token'), false);
  session.forgetAccount();
  assert.equal(preview.readPreviewIdentity(), null);
});
test('email or username cannot masquerade as a Supabase storage account ID', () => {
  assert.equal(typeof session.rememberAccount, 'function');
  assert.throws(() => session.rememberAccount(account('maria@example.com')));
});
