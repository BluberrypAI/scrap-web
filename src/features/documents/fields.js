// 서식 입력칸 목록 (scrap-documents FORM_INPUTS를 서버 body 이름(snake_case)으로 옮김)
// from: 'company' | 'waste' → body.company / body.waste 아래 key
const ALL = ['form6', 'form12', 'form5'];

export const FORM_INPUTS = [
  { from: 'company', key: 'name', label: '① 상호(명칭)', forms: ALL },
  { from: 'company', key: 'business_registration_number', label: '② 사업자등록번호', forms: ALL, hint: '예: 123-45-67890' },
  { from: 'company', key: 'representative_name', label: '③ 성명(대표자)', forms: ALL, hint: '④ 생년월일은 받지 않아요. 받은 파일에 직접 적어 주세요' },
  { from: 'company', key: 'address', label: '⑤ 주소(사업장)', forms: ALL },
  { from: 'company', key: 'industrial_complex_name', label: '⑤ 산업단지명', forms: ['form6', 'form12'], hint: '산업단지 안에 있을 때만' },
  { from: 'company', key: 'phone', label: '⑤ 전화번호', forms: ALL },
  { from: 'company', key: 'industry', label: '⑥ 업종', forms: ['form6', 'form12'], hint: { form6: '한국표준산업분류 소분류 업종명', form12: '한국표준산업분류 세세분류 업종명' } },
  { from: 'company', key: 'raw_material', label: '⑦ 주 원료명 및 사용량', forms: ['form6', 'form12'], hint: '예: 폴리프로필렌 수지 120톤/년' },
  { from: 'company', key: 'main_product', label: '⑧ 주 생산품명 및 생산량', forms: ['form6', 'form12'], hint: '예: 자동차 내장 사출품 110톤/년' },
  { from: 'company', key: 'process_flow', label: '⑨ 제조공정', forms: ['form6', 'form12'], hint: '원료 투입부터 출하까지, 폐기물 나오는 곳을 적어 주세요', wide: true },
  { from: 'waste', key: 'group', label: '⑩ 구분', forms: ['form6'], options: [['', '선택'], ['1', '1 사업장비배출시설계'], ['2', '2 사업장배출시설계']] },
  { from: 'waste', key: 'designated_kind', label: '⑩ 폐기물 종류', forms: ['form12'], hint: '시행령 별표 1 종류 (예: 폐산, 폐유)' },
  { from: 'waste', key: 'waste_code', label: '분류번호', forms: ALL, placeholder: '51-03-01' },
  { from: 'waste', key: 'physical_state', label: '성질·상태', forms: ALL, options: [['', '문진 답 그대로'], ['solid', '고체'], ['liquid', '액체']] },
  { from: 'waste', key: 'container', label: '용기(드럼 등)에 담아 배출', forms: ['form12', 'form5'], type: 'checkbox', hint: '지정폐기물이면 성질·상태를 "기타"로 적어요' },
  { from: 'waste', key: 'tons_per_month', label: '⑫ 배출량 (톤/월)', forms: ['form6'], type: 'number' },
  { from: 'waste', key: 'kg_per_month', label: '⑫ 배출량 (kg/월)', forms: ['form12'], type: 'number' },
  { from: 'waste', key: 'tons_per_year', label: '배출량·위탁량 (톤/년)', forms: ALL, type: 'number' },
  { from: 'waste', key: 'frequency', label: '⑬ 배출주기', forms: ['form12'], hint: '예: 1회/월, 수시, 3~7월' },
  { from: 'waste', key: 'carrier', label: '운반자', forms: ['form6', 'form12'], hint: '직접 운반하면 "자가", 아니면 운반 업체 이름' },
  { from: 'waste', key: 'carried_tons', label: '운반량', forms: ['form6', 'form12'], type: 'number' },
  { from: 'waste', key: 'treatment', label: '처리구분', forms: ['form6', 'form12'], options: [['', '선택'], ['위탁', '위탁'], ['자가', '자가']] },
  { from: 'waste', key: 'vendor', label: '처리 업체(업소명)', forms: ['form6', 'form12'] },
  { from: 'waste', key: 'method', label: '처리방법 번호 (4자리)', forms: ['form6', 'form12'], hint: '업체가 준 수탁확인서(제5호) ㉕의 번호' },
  { from: 'waste', key: 'treated_tons_per_year', label: '처리량 (톤/년)', forms: ['form6', 'form12'], type: 'number' },
];

// 제출 정보 (제6·12호만). 제5호는 날짜·서명이 업체 몫이라 받지 않는다
export const SUBMIT_FORMS = ['form6', 'form12'];
export const hasSubmit = (kind) => SUBMIT_FORMS.includes(kind);
export const RECIPIENT_HINT = {
  form6: '사업장이 있는 시·군·구의 장. 예: 화성시장, 수원시 영통구청장, 세종특별자치시장',
  form12: '시·도지사 또는 유역(지방)환경청장. 예: 경기도지사, 한강유역환경청장',
};
export const RECIPIENT_SUGGESTIONS = {
  form6: ['화성시장', '수원시 영통구청장', '세종특별자치시장', '제주특별자치도지사'],
  form12: ['경기도지사', '서울특별시장', '한강유역환경청장', '낙동강유역환경청장', '금강유역환경청장'],
};
export const PHYSICAL_STATE_HELP = '배출할 때 폐기물이 굳어 있는지(고체) 흐르는지(액체)입니다. 제6호·제5호는 숫자(고체 1, 액체 2)로, 제12호는 글자(고상·액상)로 적습니다. 슬러지처럼 반쯤 흐르는 것은 서식에 칸이 없어 비워 두고 관할 기관에 물어보세요. 지정폐기물을 드럼·통 같은 용기에 담아 내보내면 제12호는 “기타”로 적습니다(용기 체크).';
export const todayString = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const FORMS = {
  form6: { title: '제6호 배출자 신고서', category: 'GENERAL' },
  form12: { title: '제12호 처리계획서', category: 'DESIGNATED' },
  form5: { title: '제5호 수탁확인서', category: null },
};

export const fieldsFor = (kind) => FORM_INPUTS.filter((f) => f.forms.includes(kind));
export const hintFor = (field, kind) => (typeof field.hint === 'object' ? field.hint[kind] : field.hint);

/** 인계(handoff)로 쓸 수 있는 서식 목록. 경로 추천이 아니거나 분류번호가 없으면 빈 배열 */
export function availableForms(handoff) {
  const result = handoff?.result ?? handoff;
  // 지정폐기물은 확실하지만 세부 번호를 못 정한 결론: 번호 칸을 비운 제출 전 초안으로 만든다
  if (result?.result_type === 'NO_CODE' && result.outcome === 'DESIGNATED_CODE_NEEDED' && result.category === 'DESIGNATED') return ['form12', 'form5'];
  if (handoff?.route_guidance?.action !== 'RECOMMEND_ROUTE') return [];
  if (result?.result_type !== 'WASTE_CODE') return [];
  if (result.category === 'GENERAL') return ['form6', 'form5'];
  if (result.category === 'DESIGNATED') return ['form12', 'form5'];
  return [];
}

/** 입력값 → 서버 body. 빈 문자열은 빼고(서버가 회사 정보로 채움), 숫자칸은 숫자로 보낸다 */
export function buildBody(kind, values) {
  const body = { company: {}, waste: {} };
  if (hasSubmit(kind)) {
    const sub = values?.submit ?? {};
    const out = {};
    for (const k of ['date', 'recipient', 'signer_name']) {
      const v = typeof sub[k] === 'string' ? sub[k].trim() : '';
      if (v) out[k] = v;
    }
    if (sub.signature_png) {
      out.signature_png = sub.signature_png;
      out.mark_type = sub.mark_type === 'seal' ? 'seal' : 'signature';
      if (sub.signer_confirmed) out.signer_confirmed = true;
    }
    if (Object.keys(out).length) body.submit = out;
  }
  for (const f of fieldsFor(kind)) {
    const v = values?.[f.from]?.[f.key];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'checkbox') { if (v) body[f.from][f.key] = true; continue; }
    if (f.options && f.key === 'group') { body[f.from][f.key] = Number(v); continue; }
    if (f.type === 'number') {
      const n = Number(v);
      body[f.from][f.key] = Number.isFinite(n) ? n : v;
      continue;
    }
    if (f.key === 'physical_state' && v !== 'solid' && v !== 'liquid') continue;
    body[f.from][f.key] = typeof v === 'string' ? v.trim() : v;
  }
  return body;
}
