import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { localHouseholdKey, openLocalHousehold, readLocalHousehold } = await import('./local-household.ts');
function storage(entries = []) { const values = new Map(entries); globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; globalThis.window = new EventTarget(); return values; }
test('local installation uses the existing active scope without changing its records or credentials', () => {
  const original = JSON.stringify({ name: 'Real household', bills: [{ id: 'mine' }] });
  const values = storage([['wattsnap-preview-session-v1', JSON.stringify({ version: 1, identity: { id: 'old@example.test', name: 'Real', email: 'old@example.test' } })], ['wattsnap-ui-preview-v1:household:old%40example.test', original]]);
  assert.equal(openLocalHousehold().scopeId, 'old@example.test');
  assert.equal(values.get('wattsnap-ui-preview-v1:household:old%40example.test'), original);
  assert.deepEqual(readLocalHousehold(), openLocalHousehold());
});
test('unscoped installations retain their existing storage and unreadable selection cannot be overwritten', () => {
  const values = storage([['wattsnap-ui-preview-v1', '{"name":"Saved home"}']]);
  assert.deepEqual(openLocalHousehold(), { version: 1 });
  assert.equal(values.get('wattsnap-ui-preview-v1'), '{"name":"Saved home"}');
  values.set(localHouseholdKey, 'unreadable');
  assert.throws(openLocalHousehold); assert.equal(values.get(localHouseholdKey), 'unreadable');
});
