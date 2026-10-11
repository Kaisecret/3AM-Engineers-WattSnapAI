import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) { try { return nextResolve(specifier, context); } catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context); throw error; } } });
const { advisoryInputWarnings, advisoryTab, captureMatch, householdMatchSignature, matchIsStale, matchPreviewAdvisory, normalizeReviewedAdvisory, originalIsDuplicate, publishedEnd, publishedStart, sampleAdvisory, sampleMatchHousehold: home, scheduleLabel, sourceLink, validateAdvisory } = await import('./review-preview.ts');
const now = new Date('2026-10-06T04:00:00Z'), input = sampleAdvisory('scheduled', now);
const record = { version: 'advisory-ui-v1', id: 'review-1', revision: 1, createdAt: now.toISOString(), reviewedAt: now.toISOString(), ...input, match: captureMatch(input.details, home, now) };

test('full entered provider and locality match has a qualified preview basis', () => {
  const result = matchPreviewAdvisory(input.details, home); assert.equal(result.status, 'affected'); assert.match(result.rationale.join(' '), /not been independently verified/);
  assert.equal(matchPreviewAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], barangay: ' PAYAO ', municipality: 'san jose de buenavista' }] }, home).status, 'affected');
  assert.equal(matchPreviewAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], barangay: '', scope: 'municipality' }] }, { ...home, locality: { ...home.locality, barangay: '' } }).status, 'affected');
});
test('ambiguous, partial, or absent areas cannot establish an exact match', () => {
  for (const areas of [[], [{ ...input.details.areas[0], scope: 'uncertain' }], [{ ...input.details.areas[0], province: '' }], [{ ...input.details.areas[0], municipality: '' }]]) assert.equal(matchPreviewAdvisory({ ...input.details, areas }, home).status, 'possibly-affected');
  assert.equal(matchPreviewAdvisory(input.details, { ...home, locality: undefined }).status, 'possibly-affected');
  assert.equal(matchPreviewAdvisory(input.details, { ...home, locality: { ...home.locality, barangay: '' } }).status, 'possibly-affected');
});
test('shared barangay names across municipalities and provinces are distinguished', () => {
  assert.equal(matchPreviewAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], municipality: 'Hamtic' }] }, home).status, 'not-listed');
  assert.equal(matchPreviewAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], province: 'Capiz' }] }, home).status, 'not-listed');
  assert.match(matchPreviewAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], barangay: 'Other barangay' }] }, home).rationale.join(' '), /does not guarantee uninterrupted power/);
});
test('missing and wrong providers do not become unqualified exact matches', () => {
  assert.equal(matchPreviewAdvisory({ ...input.details, provider: '' }, home).status, 'possibly-affected');
  assert.equal(matchPreviewAdvisory(input.details, { ...home, provider: undefined }).status, 'possibly-affected');
  assert.equal(matchPreviewAdvisory({ ...input.details, provider: 'capelco' }, home).status, 'not-listed');
});
test('unknown dates, times, and restoration remain unknown', () => {
  const uncertain = sampleAdvisory('uncertain', now).details;
  assert.equal(publishedStart(uncertain), null); assert.equal(publishedEnd(uncertain), null);
  assert.match(scheduleLabel(uncertain), /Unknown – Unknown/); assert.equal(uncertain.expectedRestoration, '');
  assert.match(advisoryInputWarnings(uncertain).join(' '), /no complete schedule.*Duration cannot be inferred.*restoration was not provided/);
});
test('schedule inputs use Manila time and reject reversed or invalid periods', () => {
  assert.equal(publishedStart(input.details), Date.parse('2026-10-07T05:00:00Z'));
  assert.equal((publishedEnd(input.details) - publishedStart(input.details)) / 3600000, 4);
  assert.equal(validateAdvisory(input.details), null);
  assert.match(validateAdvisory({ ...input.details, endTime: '12:00' }), /after the start/);
  assert.equal(validateAdvisory({ ...input.details, endTime: '02:00', endDate: '2026-10-08' }), null);
  assert.match(validateAdvisory({ ...input.details, date: '2026-02-29' }), /valid dates/);
  assert.match(validateAdvisory({ ...input.details, startTime: '25:00' }), /valid 24-hour times/);
  assert.match(validateAdvisory({ ...input.details, endDate: '2026-10-06', endTime: '' }), /end date cannot be earlier/);
});
test('exact area scope requires the full hierarchy while uncertain scope may stay incomplete', () => {
  assert.match(validateAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], province: '' }] }), /province and municipality/);
  assert.match(validateAdvisory({ ...input.details, areas: [{ ...input.details.areas[0], barangay: '' }] }), /listed barangay/);
  assert.equal(validateAdvisory({ ...input.details, areas: [{ province: '', municipality: '', barangay: '', scope: 'uncertain' }] }), null);
});
test('only explicit web source links can be opened', () => {
  assert.equal(sourceLink('https://example.org/provider/post'), 'https://example.org/provider/post');
  for (const link of ['javascript:alert(1)', 'data:text/html,hello', '/relative', 'https://secret@example.org/']) { assert.equal(sourceLink(link), null); assert.match(validateAdvisory({ ...input.details, sourceUrl: link }), /complete http or https/); }
});
test('household location/provider revisions mark a match for re-review without budget/name noise', () => {
  assert.equal(matchIsStale(record, home), false);
  assert.equal(matchIsStale(record, { ...home, name: 'New name', budget: 999 }), false);
  assert.equal(matchIsStale(record, { ...home, provider: 'akelco' }), true);
  assert.equal(matchIsStale(record, { ...home, locality: { ...home.locality, barangay: 'Other' } }), true);
  assert.notEqual(householdMatchSignature(home), householdMatchSignature({ ...home, location: 'Changed address' }));
  const updated = { ...record, match: captureMatch(record.details, { ...home, provider: 'akelco' }, now) }; assert.equal(matchIsStale(updated, { ...home, provider: 'akelco' }), false); assert.deepEqual(updated.original, record.original);
});
test('normalization preserves originals and rejects malformed records without guessing data', () => {
  assert.deepEqual(normalizeReviewedAdvisory(structuredClone(record)), record);
  assert.equal(normalizeReviewedAdvisory({ ...record, revision: 0 }), null);
  assert.equal(normalizeReviewedAdvisory({ ...record, createdAt: 123 }), null);
  assert.equal(normalizeReviewedAdvisory({ ...record, original: { ...record.original, text: '' } }), null);
  assert.equal(normalizeReviewedAdvisory({ ...record, match: { ...record.match, householdBasis: { location: {} } } }), null);
  assert.equal(normalizeReviewedAdvisory({ ...record, details: { ...record.details, sourceUrl: 'javascript:alert(1)' } }), null);
});
test('duplicate original detection excludes the review being corrected', () => {
  assert.equal(originalIsDuplicate(record.original, [record]).id, record.id); assert.equal(originalIsDuplicate(record.original, [record], record.id), undefined);
  const photo = { ...record, id: 'photo', original: { kind: 'image', name: 'notice.png', text: '', image: 'data:image/png;base64,YQ==', capturedAt: now.toISOString() } };
  assert.equal(originalIsDuplicate(photo.original, [photo]).id, 'photo'); assert.equal(originalIsDuplicate({ ...photo.original, image: 'data:image/png;base64,Yg==' }, [photo]), undefined);
});
test('restoration updates remain separate and samples stay identified', () => {
  const restored = sampleAdvisory('restored', now); assert.equal(restored.details.type, 'restored'); assert.equal(restored.original.kind, 'sample'); assert.equal(restored.details.relatedId, '');
  assert.match(advisoryInputWarnings(restored.details).join(' '), /saved separately/);
  assert.equal(advisoryTab({ ...record, ...restored }, now), 'history'); assert.equal(advisoryTab(record, now), 'active');
  assert.equal(advisoryTab(record, new Date('2026-10-08T02:00:00Z')), 'history'); assert.deepEqual(input.original, record.original);
});

test('an overnight or multi-day interruption stays active until it ends', () => {
  const tab = (details, at) => advisoryTab({ ...record, details: { ...input.details, ...details } }, new Date(at));
  // 8 PM on the 11th to 2 AM on the 12th, Manila time.
  const overnight = { date: '2026-10-11', startTime: '20:00', endDate: '2026-10-12', endTime: '02:00' };
  assert.equal(tab(overnight, '2026-10-11T16:30:00Z'), 'active', '00:30 on the 12th: still going');
  assert.equal(tab(overnight, '2026-10-11T18:01:00Z'), 'history', '02:01 on the 12th: over');
  // A stated end decides even on the start day.
  assert.equal(tab({ date: '2026-10-11', startTime: '08:00', endDate: '', endTime: '17:00' }, '2026-10-11T08:59:00Z'), 'active');
  assert.equal(tab({ date: '2026-10-11', startTime: '08:00', endDate: '', endTime: '17:00' }, '2026-10-11T09:01:00Z'), 'history');
  // Several days with no end time: active through its last day, history the day after.
  const days = { date: '2026-10-10', startTime: '', endDate: '2026-10-12', endTime: '' };
  assert.equal(tab(days, '2026-10-12T15:00:00Z'), 'active', '11 PM on the last day');
  assert.equal(tab(days, '2026-10-12T16:30:00Z'), 'history', '00:30 the day after');
  // No end at all: over once its day has passed, as before.
  assert.equal(tab({ date: '2026-10-11', startTime: '08:00', endDate: '', endTime: '' }, '2026-10-11T15:00:00Z'), 'active');
  assert.equal(tab({ date: '2026-10-11', startTime: '08:00', endDate: '', endTime: '' }, '2026-10-11T16:30:00Z'), 'history');
  assert.equal(tab({ date: '', startTime: '', endDate: '', endTime: '' }, '2027-01-01T00:00:00Z'), 'active', 'an undated advisory is not moved to history');
});

test('a collected advisory keeps its post link, and only a real facebook.com link is accepted', () => {
  const collected = feed => ({ ...record, original: { kind: 'text', name: 'ANTECO Facebook post', text: 'SCHEDULED POWER INTERRUPTION', capturedAt: now.toISOString(), feed } });
  const kept = normalizeReviewedAdvisory(collected({ url: 'https://www.facebook.com/antecoPH/posts/1', fromImages: true }));
  assert.deepEqual(kept.original.feed, { url: 'https://www.facebook.com/antecoPH/posts/1', fromImages: true });
  assert.ok(normalizeReviewedAdvisory(collected({ url: 'https://m.facebook.com/story.php?id=1', fromImages: false })));
  for (const feed of [null, 'https://www.facebook.com/antecoPH', {}, { url: 'https://www.facebook.com/antecoPH/posts/1' }, { url: 'https://www.facebook.com/antecoPH/posts/1', fromImages: 'yes' },
    { url: 'http://www.facebook.com/antecoPH/posts/1', fromImages: false }, { url: 'https://facebook.com.example.org/post', fromImages: false }, { url: 'https://example.org/facebook.com/', fromImages: false },
    { url: 'https://user:secret@www.facebook.com/post', fromImages: false }, { url: 'javascript:alert(1)', fromImages: false }, { url: `https://www.facebook.com/${'x'.repeat(500)}`, fromImages: false }]) {
    assert.equal(normalizeReviewedAdvisory(collected(feed)), null, JSON.stringify(feed));
  }
  // The mark belongs to collected text only: a screenshot or a sample cannot carry it.
  assert.equal(normalizeReviewedAdvisory({ ...record, original: { ...record.original, feed: { url: 'https://www.facebook.com/antecoPH/posts/1', fromImages: false } } }), null);
  assert.ok(normalizeReviewedAdvisory(record), 'an advisory added by hand needs no such mark');
});
