// 사업장 판정 고정값: 회원가입에서 받고 문진 건을 만들 때 server가 엔진에 넘긴다.
// 이름·값은 server companies 스키마(SiteConditions)와 엔진 사실 카탈로그와 같다. null = 모름·미입력.
export const SITE_CONDITIONS = [
  {
    key: 'emission_facility',
    label: '대기·물·소음진동 배출시설이 있나요?',
    help: '배출시설 설치허가증이나 신고증명서가 있으면 "예"예요.',
    type: 'yesno',
  },
  {
    key: 'daily_avg_kg',
    label: '사업장 전체 폐기물 하루 평균 배출량(kg)',
    help: '올바로시스템의 연간 배출량을 작업일 수로 나눈 값이면 충분해요.',
    type: 'number',
  },
  {
    key: 'public_facility',
    label: '공공폐수·공공하수·분뇨·가축분뇨 공공처리시설이나 폐기물처리시설을 운영하나요?',
    type: 'yesno',
  },
  {
    key: 'site_emits_designated',
    label: '다른 공정에서 지정폐기물(폐유·폐산 등)이 나오나요?',
    type: 'yesno',
  },
];

export const YES_NO_OPTIONS = [
  { value: '', label: '모름' },
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니요' },
];

/** 서버 값 → 입력란 값(문자열). null은 빈 문자열(모름) */
export function siteConditionsDraft(company) {
  return Object.fromEntries(
    SITE_CONDITIONS.map(({ key }) => [key, company?.[key] == null ? '' : String(company[key])]),
  );
}

/** 입력란 값 → 서버 값. 숫자가 아니거나 음수면 { error } */
export function siteConditionsPayload(draft) {
  const out = {};
  for (const { key, type, label } of SITE_CONDITIONS) {
    const text = String(draft?.[key] ?? '').trim();
    if (!text) {
      out[key] = null;
    } else if (type === 'number') {
      const n = Number(text);
      if (!Number.isFinite(n) || n < 0) return { error: `${label}은 0 이상의 숫자로 입력해 주세요.` };
      out[key] = n;
    } else {
      out[key] = text;
    }
  }
  return { values: out };
}

/** 화면 표시용 문자열 */
export function siteConditionLabel(condition, value) {
  if (value == null || value === '') return '모름';
  if (condition.type === 'number') return `${value}kg/일`;
  return YES_NO_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}
