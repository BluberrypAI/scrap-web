import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteConditionLabel, siteConditionsDraft, siteConditionsPayload, SITE_CONDITIONS } from './siteConditions.js';

test('빈 값은 null(모름)로 보낸다', () => {
  const { values } = siteConditionsPayload({ emission_facility: 'yes', daily_avg_kg: ' 120.5 ' });
  assert.deepEqual(values, {
    emission_facility: 'yes',
    daily_avg_kg: 120.5,
    public_facility: null,
    site_emits_designated: null,
  });
});

test('음수나 숫자가 아닌 배출량은 오류', () => {
  assert.ok(siteConditionsPayload({ daily_avg_kg: '-1' }).error);
  assert.ok(siteConditionsPayload({ daily_avg_kg: 'abc' }).error);
});

test('서버 값과 입력란 값이 왕복한다', () => {
  const company = { emission_facility: 'no', daily_avg_kg: 0, public_facility: null };
  const draft = siteConditionsDraft(company);
  assert.equal(draft.daily_avg_kg, '0');
  assert.equal(draft.public_facility, '');
  assert.equal(siteConditionsPayload(draft).values.daily_avg_kg, 0);
});

test('표시 문자열', () => {
  const [emission, daily] = SITE_CONDITIONS;
  assert.equal(siteConditionLabel(emission, 'yes'), '예');
  assert.equal(siteConditionLabel(emission, null), '모름');
  assert.equal(siteConditionLabel(daily, 300), '300kg/일');
});
