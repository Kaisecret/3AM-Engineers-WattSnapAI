import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { activationPreview, cachedAge, countdownParts, durationLabel, manilaTimestamp, normalizeBrownoutPlan, planChanges, scheduleState } = await import('./calculations.ts');
const { captureMatch, sampleAdvisory, sampleMatchHousehold: home } = await import('../advisory-intelligence/review-preview.ts');
const now = Date.parse('2026-10-07T04:00:00Z'), input = sampleAdvisory('scheduled', new Date(now));
const details = { ...input.details, date: '2026-10-07' };
const record = { version: 'advisory-ui-v1', id: 'advisory-1', revision: 1, createdAt: new Date(now).toISOString(), reviewedAt: new Date(now).toISOString(), original: input.original, details, match: captureMatch(details, home, new Date(now)) };
const plan = { version: 'brownout-ui-v1', id: record.id, advisory: record, sourceConfirmed: true, relevanceConfirmed: false, checked: ['charge'], acknowledgedUpdates: [], createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };

test('13–17 Manila is four hours and one hour ahead at 12 Manila', () => {
  const schedule = scheduleState(details, now); assert.equal(schedule.state, 'future'); assert.equal(schedule.remaining, 3600000); assert.equal(schedule.duration, 14400000); assert.equal(durationLabel(schedule.duration), '4 hours'); assert.deepEqual(countdownParts(schedule.remaining), { days: 0, hours: 1, minutes: 0, seconds: 0 }); assert.match(manilaTimestamp(schedule.start), /1:00/);
});
test('past start and elapsed end never expose a future countdown', () => {
  const started = scheduleState(details, Date.parse('2026-10-07T05:00:00Z')); assert.equal(started.state, 'started'); assert.equal(started.remaining, null);
  const ended = scheduleState(details, Date.parse('2026-10-07T09:00:00Z')); assert.equal(ended.state, 'elapsed'); assert.equal(ended.remaining, null); assert.equal(details.expectedRestoration, '');
});
test('unknown starts, ends and overnight durations remain distinct', () => {
  const noStart = scheduleState({ ...details, startTime: '' }, now); assert.equal(noStart.state, 'unknown'); assert.equal(noStart.remaining, null); assert.equal(noStart.duration, null);
  const noEnd = scheduleState({ ...details, endTime: '' }, now); assert.equal(noEnd.duration, null); assert.equal(durationLabel(noEnd.duration), 'Unknown');
  const overnight = scheduleState({ ...details, startTime: '23:30', endDate: '2026-10-08', endTime: '01:15' }, now); assert.equal(durationLabel(overnight.duration), '1 hour 45 minutes');
  assert.equal(scheduleState({ ...details, endTime: '11:00' }, now).duration, null);
});
test('activation recommends affected future schedules and blocks not-listed, stale and elapsed reviews', () => {
  assert.equal(activationPreview(record, home, now).recommended, true);
  const uncertainDetails = { ...details, areas: [{ ...details.areas[0], scope: 'uncertain' }] }, uncertain = { ...record, details: uncertainDetails, match: captureMatch(uncertainDetails, home) };
  assert.equal(activationPreview(uncertain, home, now).blocked, null); assert.equal(activationPreview(uncertain, home, now).recommended, false); assert.equal(activationPreview(uncertain, home, now).status, 'possibly-affected');
  const otherDetails = { ...details, provider: 'capelco' }, other = { ...record, details: otherDetails, match: captureMatch(otherDetails, home) }; assert.match(activationPreview(other, home, now).blocked, /Not Listed/);
  assert.match(activationPreview(record, { ...home, provider: 'capelco' }, now).blocked, /changed household/);
  assert.match(activationPreview(record, home, now + 5 * 3600000).blocked, /elapsed/);
  assert.match(activationPreview({ ...record, details: { ...details, type: 'restored' } }, home, now).blocked, /update or notice/);
});
test('plan snapshot, location changes and separately linked update revisions are tracked', () => {
  assert.equal(planChanges(plan, [record], home).sourceChanged, false); assert.equal(planChanges(plan, [], home).missing, true);
  assert.equal(planChanges(plan, [{ ...record, revision: 2 }], home).sourceChanged, true);
  assert.equal(planChanges(plan, [record], { ...home, name: 'Renamed' }).householdChanged, false); assert.equal(planChanges(plan, [record], { ...home, location: 'Changed locality' }).householdChanged, true);
  const update = { ...record, id: 'update', details: { ...details, type: 'restored', relatedId: record.id } }; assert.equal(planChanges(plan, [record, update], home).updates.length, 1);
  const acknowledged = { ...plan, acknowledgedUpdates: [{ id: update.id, revision: 1 }] }; assert.equal(planChanges(acknowledged, [record, update], home).updates.length, 0); assert.equal(planChanges(acknowledged, [record, { ...update, revision: 2 }], home).updates.length, 1);
  assert.equal(plan.advisory.details.endTime, '17:00');
});
test('stored plans require source confirmation, valid checklist and explicit uncertain relevance', () => {
  assert.deepEqual(normalizeBrownoutPlan(plan), plan); assert.equal(normalizeBrownoutPlan({ ...plan, sourceConfirmed: false }), null); assert.equal(normalizeBrownoutPlan({ ...plan, checked: ['charge', 'charge'] }), null); assert.equal(normalizeBrownoutPlan({ ...plan, checked: ['unknown'] }), null); assert.equal(normalizeBrownoutPlan({ ...plan, advisory: { ...record, match: { ...record.match, status: 'possibly-affected' } } }), null);
  assert.ok(normalizeBrownoutPlan({ ...plan, relevanceConfirmed: true, advisory: { ...record, match: { ...record.match, status: 'possibly-affected' } } }));
  assert.equal(normalizeBrownoutPlan({ ...plan, advisory: { ...record, original: { kind: 'image' } } }), null); assert.equal(normalizeBrownoutPlan({ ...plan, updatedAt: 'invalid' }), null);
});
test('cached ages disclose clock inconsistencies and countdown never goes negative', () => {
  assert.match(cachedAge(new Date(now + 1000).toISOString(), now), /Device time/); assert.match(cachedAge(new Date(now - 120000).toISOString(), now), /2 min/); assert.equal(countdownParts(-1).seconds, 0); assert.equal(countdownParts(86400100).days, 1);
});
