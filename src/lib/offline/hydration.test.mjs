import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context); throw error; } } });
const review = await import('../../features/advisory-intelligence/review-preview.ts');
const calculations = await import('../../features/brownout-ready/calculations.ts');
const { householdStores } = await import('./database.ts');
function record() {
  const stamp = '2040-10-01T00:00:00.000Z', { details, original } = review.sampleAdvisory('scheduled', new Date(stamp));
  return { version: 'advisory-ui-v1', id: randomUUID(), revision: 1, createdAt: stamp, reviewedAt: stamp, details, original: { ...original, kind: 'text' }, match: review.captureMatch(details, review.sampleMatchHousehold, new Date(stamp)) };
}
function loadHook(path, fn, key, raw, dependencies) {
  const exports = {}, states = [];
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, localStorage: { getItem: () => raw }, window: { addEventListener() {}, removeEventListener() {} }, require(name) {
    if (name === 'react') return { useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)], useEffect: fn => fn() };
    if (name === '@/features/auth/use-preview-storage-key') return { previewStorageFor: () => key, usePreviewStorageKey: () => key };
    return dependencies[name];
  } });
  exports[fn](); return states;
}
test('merged advisory histories from two devices remain readable in the actual UI hook', () => {
  const store = householdStores('account').find(store => store.name === 'advisories'), list = Array.from({ length: 140 }, record);
  const raw = store.write(Object.fromEntries(list.map(item => [item.id, item])), null);
  const states = loadHook('../../features/advisory-intelligence/use-preview-advisories.ts', 'usePreviewAdvisories', store.key, raw, { './review-preview': review });
  assert.ok(states.some(value => Array.isArray(value) && value.length === 140), 'all merged advisories should load');
});
test('merged preparation plans from two devices remain readable in the actual UI hook', () => {
  const store = householdStores('account').find(store => store.name === 'plans'), list = Array.from({ length: 30 }, () => {
    const advisory = record(); return { version: 'brownout-ui-v1', id: advisory.id, advisory, relevanceConfirmed: true, sourceConfirmed: true, checked: [], acknowledgedUpdates: [], createdAt: advisory.createdAt, updatedAt: advisory.createdAt };
  });
  const raw = store.write(Object.fromEntries(list.map(item => [item.id, item])), null);
  const states = loadHook('../../features/brownout-ready/use-preview-plans.ts', 'usePreviewPlans', store.key, raw, { './calculations': calculations });
  assert.ok(states.some(value => Array.isArray(value) && value.length === 30), 'all merged plans should load');
});
