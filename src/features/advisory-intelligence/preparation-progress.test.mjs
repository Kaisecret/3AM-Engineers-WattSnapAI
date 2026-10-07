import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { parsePreparationProgress, parsePreparationState, pendingPreparation, pendingHomePreparation, preparationEligible, preparationKey } = await import('./preparation-progress.ts');
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
const sample = { record: { ...record, id: 'sample-gallery-scheduled' }, checked: ['unplug', 'fridge'], updatedAt: '2026-10-07T04:01:00Z' };
test('sample storage preserves legacy reviews and validates its separate advisory snapshot', () => {
  assert.deepEqual(parsePreparationState(raw([progress])), { entries: [progress], sample: null });
  const state = JSON.stringify({ version: 1, entries: [progress], sampleChecklist: sample });
  assert.deepEqual(parsePreparationState(state), { entries: [progress], sample });
  for (const invalid of [{ ...sample, checked: ['unplug', 'unplug'] }, { ...sample, checked: ['unknown'] }, { ...sample, record }, { ...sample, record: { ...sample.record, original: { ...sample.record.original, kind: 'text' } } }, { ...sample, updatedAt: 'invalid' }]) {
    assert.throws(() => parsePreparationState(JSON.stringify({ version: 1, entries: [progress], sampleChecklist: invalid })));
  }
});
test('Home shows the checked sample even for a different household, and hides unused/completed/elapsed samples', () => {
  const otherHome = { ...home, provider: 'akelco' };
  const pending = pendingHomePreparation([], [], otherHome, sample, now);
  assert.equal(pending.checked.length, 2);
  assert.equal(pending.gallery, true);
  assert.equal(pendingHomePreparation([], [], otherHome, { ...sample, checked: [] }, now), undefined);
  assert.equal(pendingHomePreparation([], [], otherHome, { ...sample, checked: ['charge', 'lights', 'unplug', 'fridge', 'water'] }, now), undefined);
  assert.equal(pendingHomePreparation([], [], otherHome, { ...sample, record: { ...sample.record, details: { ...sample.record.details, date: '2026-10-06' } } }, now), undefined);
});
test('Home resumes the latest checklist without combining saved and gallery progress', () => {
  const latestSample = pendingHomePreparation([record], [progress], home, sample, now);
  assert.equal(latestSample.gallery, true);
  assert.deepEqual(latestSample.checked, ['unplug', 'fridge']);
  const latestSaved = pendingHomePreparation([record], [{ ...progress, updatedAt: '2026-10-07T04:02:00Z' }], home, sample, now);
  assert.equal(latestSaved.gallery, false);
  assert.deepEqual(latestSaved.checked, ['charge', 'water']);
});
