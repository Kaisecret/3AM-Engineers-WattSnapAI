import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { parsePreparationProgress, pendingPreparation, preparationEligible, preparationKey } = await import('./preparation-progress.ts');
const { captureMatch, sampleAdvisory, sampleMatchHousehold: home } = await import('./review-preview.ts');
const now = new Date('2026-10-07T04:00:00Z'), input = sampleAdvisory('scheduled', now);
const record = { version: 'advisory-ui-v1', id: 'first', revision: 1, createdAt: now.toISOString(), reviewedAt: now.toISOString(), ...input, match: captureMatch(input.details, home, now) };
const progress = { key: preparationKey(record, home), checked: ['charge', 'water'], updatedAt: now.toISOString() };
const raw = entries => JSON.stringify({ version: 1, entries });

test('saved progress accepts only unique known items and valid review bases', () => {
  assert.deepEqual(parsePreparationProgress(null), []);
  assert.deepEqual(parsePreparationProgress(raw([progress])), [progress]);
  for (const checked of [['charge', 'charge'], ['work'], ['missing'], [false], ['charge', 'lights', 'unplug', 'fridge', 'water', 'extra']]) assert.throws(() => parsePreparationProgress(raw([{ ...progress, checked }])));
  for (const key of ['not-json', '[]', JSON.stringify(['first', 0, 'household']), JSON.stringify(['first', 1.5, 'household']), JSON.stringify(['', 1, 'household'])]) assert.throws(() => parsePreparationProgress(raw([{ ...progress, key }])));
  assert.throws(() => parsePreparationProgress(raw([progress, progress])));
  assert.throws(() => parsePreparationProgress(raw([{ ...progress, updatedAt: 'unknown' }])));
  assert.throws(() => parsePreparationProgress('{bad json'));
  assert.throws(() => parsePreparationProgress(JSON.stringify({ version: 2, entries: [] })));
});
test('reminders use the actual checked count and disappear after all five checks', () => {
  assert.equal(pendingPreparation([record], [], home, now).checked.length, 0);
  assert.equal(pendingPreparation([record], [progress], home, now).checked.length, 2);
  assert.equal(pendingPreparation([record], [{ ...progress, checked: ['charge', 'lights', 'unplug', 'fridge', 'water'] }], home, now), undefined);
});
test('different advisories and corrected revisions do not inherit completed progress', () => {
  const complete = { ...progress, checked: ['charge', 'lights', 'unplug', 'fridge', 'water'] };
  const second = { ...record, id: 'second' }, corrected = { ...record, revision: 2 };
  assert.equal(pendingPreparation([record, second], [complete], home, now).record.id, 'second');
  assert.equal(pendingPreparation([corrected], [complete], home, now).checked.length, 0);
  assert.notEqual(preparationKey(record, home), preparationKey(record, { ...home, location: 'Changed household' }));
});
test('stale, uncertain, not-listed, elapsed and restoration records do not show preparation reminders', () => {
  const records = ['uncertain', 'not-listed', 'restored'].map(kind => { const input = sampleAdvisory(kind, now); return { ...record, id: kind, ...input, match: captureMatch(input.details, home, now) }; });
  const elapsed = { ...record, details: { ...record.details, date: '2026-10-06' } };
  assert.equal(pendingPreparation([...records, elapsed], [progress], home, now), undefined);
  assert.equal(preparationEligible(record, { ...home, provider: 'akelco' }, now), false);
  assert.equal(preparationEligible(record, { ...home, location: 'Changed household' }, now), false);
});
test('the Home reminder prefers the most recently updated incomplete checklist', () => {
  const second = { ...record, id: 'second' };
  const secondProgress = { ...progress, key: preparationKey(second, home), updatedAt: '2026-10-07T04:01:00Z' };
  assert.equal(pendingPreparation([record, second], [progress, secondProgress], home, now).record.id, 'second');
});
