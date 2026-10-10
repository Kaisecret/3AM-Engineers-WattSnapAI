import assert from 'node:assert/strict';
import test from 'node:test';
const auth = await import('./authorization.ts');
test('every household route is protected, including nested forms', () => {
  assert.equal(typeof auth.isProtectedPath, 'function');
  for (const path of ['/dashboard','/setup','/onboarding','/bills/new','/appliances/new','/tips','/settings','/assistant','/budget','/brownout-ready','/simulator','/advisories/new','/complete-profile']) assert.equal(auth.isProtectedPath(path), true, path);
  for (const path of ['/','/login','/signup','/forgot-password','/reset-password','/auth/callback','/api/auth/send-email','/dashboard-lookalike']) assert.equal(auth.isProtectedPath(path), false, path);
});
test('only verified authenticated claims allow protected access', async () => {
  assert.equal(typeof auth.hasVerifiedClaims, 'function');
  assert.equal(await auth.hasVerifiedClaims({ auth: { getClaims: async () => ({ data: { claims: { sub: 'user', role: 'authenticated' } }, error: null }) } }), true);
  for (const reply of [{ data: null, error: null }, { data: { claims: { sub: 'user', role: 'anon' } }, error: null }, { data: { claims: { sub: 'forged', role: 'authenticated' } }, error: new Error('bad signature') }]) {
    assert.equal(await auth.hasVerifiedClaims({ auth: { getClaims: async () => reply } }), false);
  }
  assert.equal(await auth.hasVerifiedClaims({ auth: { getClaims: async () => { throw new Error('offline'); } } }), false);
});
