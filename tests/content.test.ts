import test from 'node:test';
import assert from 'node:assert/strict';
import { published, featured, assertUniqueSlugs, formatDate } from '../src/lib/collection-utils.ts';
const entry = (slug: string, date: string, draft = false, order = 10) => ({ data: { slug, date: new Date(date), draft, featured: true, order } });
test('drafts stay out of both published and featured content', () => {
  const data = [entry('older', '2026-01-01', false, 1), entry('newer', '2026-03-01', false, 2), entry('secret', '2026-04-01', true, 0)];
  assert.deepEqual(published(data).map((e) => e.data.slug), ['newer', 'older']);
  assert.deepEqual(featured(data).map((e) => e.data.slug), ['older', 'newer']);
  assert.equal(data.length, 3);
});
test('duplicate URLs stop the build instead of replacing another page', () => {
  assert.throws(() => assertUniqueSlugs([entry('same', '2026-01-01'), entry('same', '2026-02-01')]), /重复/);
});
test('display dates follow China time', () => { assert.equal(formatDate(new Date('2026-10-26T17:00:00Z')), '2026.10.27'); });
