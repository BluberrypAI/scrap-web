import assert from 'node:assert/strict';
import test from 'node:test';
import { holdReason, initialAnswers, materials, routeInput } from './surveyScope.js';

const [pp, pe, pet, aluminium] = materials;

function classified(code, material) {
  return {
    as_of: '2026-11-07',
    result: {
      kind: 'code',
      code,
      provisional: true,
      treatment: { material, waste_code: code },
      recycle: { status: 'ALLOWED', free: [['R-3-3', '예시']], analysis: [['R-10', '예시']] },
    },
  };
}

test('scoped intake only seeds facts supported by the selected form', () => {
  assert.deepEqual(materials.map(({ key }) => key), ['pp', 'pe', 'pet', 'aluminium']);
  assert.equal(initialAnswers(pp, pp.forms[0]).resin_stream, 'ordinary_resin');
  assert.equal(initialAnswers(pet, pet.forms[0]).resin_stream, 'discarded_packaging');
  assert.equal(initialAnswers(pp, pp.forms[1]).resin_stream, undefined);
  assert.equal(initialAnswers(pe, pe.forms[0]).resin_stream, undefined);
  assert.equal(initialAnswers(aluminium, aluminium.forms[0]).can_scope, undefined);
});

test('contamination or unclear scope holds the case before candidate lookup', () => {
  for (const answers of [
    { designated_residue: true }, { oil_presence: 'UNKNOWN' },
    { oil_presence: 'present' }, { pcb_possible: true }, { toxic_chemical_discard: 'UNKNOWN' },
    { can_scope: 'covered_steel' }, { resin_stream: 'UNKNOWN' }, { physical_state: 'liquid' },
  ]) assert.ok(holdReason(answers));
  assert.equal(holdReason({ designated_residue: false, oil_presence: 'none', can_scope: 'covered_aluminium' }), null);
});

test('candidate request keeps the classification number and grouped R codes', () => {
  const view = classified('51-03-07', 'PE');
  const input = routeInput(view, pe, pe.forms[0]);
  assert.equal(input.waste_code, '51-03-07');
  assert.equal(input.input_form, 'film');
  assert.equal(input.classificationProvisional, true);
  assert.deepEqual(input.recycling_types, { free: ['R-3-3'], analysis: ['R-10'], unmarked: [] });
  assert.equal(routeInput(classified('51-29-03', 'aluminium'), aluminium, aluminium.forms[0]).material, 'aluminium');
});

test('out-of-scope, unfinished, or disallowed classifications cannot create a route', () => {
  assert.equal(routeInput(classified('51-03-07', 'PP'), pp, pp.forms[1]), null);
  assert.equal(routeInput(classified('51-03-01', 'PE'), pp, pp.forms[0]), null);
  const view = classified('51-03-01', 'PP');
  assert.equal(routeInput({ ...view, question: {} }, pp, pp.forms[0]), null);
  assert.equal(routeInput({ ...view, needs_review: ['resin_stream'] }, pp, pp.forms[0]), null);
  view.result.recycle.status = 'PROHIBITED_OR_NOT_LISTED';
  assert.equal(routeInput(view, pp, pp.forms[0]), null);
});
