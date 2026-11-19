import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyOptions } from './route-result.js';

test('distinct top five on map, every remaining candidate remains accessible', () => {
  const sites = Array.from({ length: 7 }, (_, i) => ({ facility_key: `site-${i}`, distance_rank: i < 5 ? i + 1 : null,
    location: { latitude: 37, longitude: 127 }, capability_key: `c-${i}` }));
  const options = [{ transition_key: 'a', facilities: sites }, { transition_key: 'b', facilities: [sites[0], { facility_key: 'unknown' }] }];
  const result = nearbyOptions(options, { latitude: 37, longitude: 127 });
  assert.equal(new Set(result.primary.flatMap(o => o.facilities.map(f => f.facility_key))).size, 5);
  assert.equal(result.other.flatMap(o => o.facilities).length, 3);
  assert.equal(options[0].facilities.length, 7);
  assert.deepEqual(nearbyOptions(options, null).primary, options);
});

test('no rank or point cannot become a nearby recommendation', () => {
  const result = nearbyOptions([{ facilities: [{ facility_key: 'x', distance_rank: 1, location: null }] }], { latitude: 37, longitude: 127 });
  assert.equal(result.primary.length, 0);
  assert.equal(result.other.length, 1);
});

test('processes without factories remain visible with and without an origin', () => {
  const unbound = { transition_key: 'pe-bale-prepare', facilities: [], sources: [{ url: 'https://example.org/process' }] };
  const bound = { transition_key: 'pe-prepare', facilities: [{ facility_key: 'known' }] };
  for (const origin of [null, { latitude: 37, longitude: 127 }]) {
    const result = nearbyOptions([unbound, bound], origin);
    assert.deepEqual(result.unbound, [unbound]);
    assert.deepEqual([...result.primary, ...result.other], [bound]);
  }
});
