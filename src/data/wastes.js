import { demoWorkplace, restoreCases } from '../features/treatment/treatment-state.js';

const baseWastes = [
  {
    id: 'wastewater-sludge',
    name: '폐수 슬러지',
    code: '51-02-01',
    status: '문진 중',
    updatedAt: '2026. 11. 04',
    category: '수처리',
  },
  {
    id: 'waste-oil',
    name: '폐유',
    code: '06-01-01',
    status: '분석 대기',
    updatedAt: '2026. 11. 03',
    category: '액상',
  },
  {
    id: 'synthetic-resin',
    name: '폐합성수지',
    code: '51-03-01',
    status: '확정',
    updatedAt: '2026. 11. 01',
    category: '합성수지',
  },
  {
    id: 'waste-alkali',
    name: '폐알칼리',
    code: '02-02-00',
    status: '처리 진행',
    updatedAt: '2026. 10. 29',
    category: '화학',
  },
  {
    id: 'slag',
    name: '광재',
    code: '03-01-01',
    status: '후보',
    updatedAt: '2026. 10. 27',
    category: '광물성',
  },
  {
    id: 'spent-adsorbent',
    name: '폐흡착제',
    code: '51-08-01',
    status: '완료',
    updatedAt: '2026. 10. 21',
    category: '흡착제',
  },
];

// 처리경로 시연 건을 더하고, 브라우저에 저장된 처리 기록을 복원한 목록
export const wastes = restoreCases([
  {
    id: 'aluminium-can-sample',
    name: '사용 후 알루미늄 캔 · 예시',
    code: '51-29-03',
    status: '확정',
    updatedAt: '2026. 11. 04',
    category: '금속',
    classifiedAt: '2026-11-04T00:00:00Z',
    treatmentInput: { material: 'aluminium', input_form: 'can', ...demoWorkplace.routeOrigin },
  },
  ...baseWastes.map((waste) =>
    waste.id === 'synthetic-resin'
      ? {
          ...waste,
          name: '폐합성수지 · PP 사출 잔재 예시',
          classifiedAt: '2026-11-01T00:00:00Z',
          treatmentInput: { material: 'PP', input_form: 'scrap', ...demoWorkplace.routeOrigin },
        }
      : waste,
  ),
]);

export const statusMessages = {
  '문진 중': '문진 5/8 · 수분 함량 질문에서 멈췄어요',
  후보: '분류 후보 중 하나를 확정해 주세요',
  확정: '처리 경로를 선택해 주세요',
  '분석 대기': '분석 결과 입력을 기다리고 있어요',
  '처리 진행': '처리업체에서 처리 중이에요',
  완료: '처리가 완료됐어요',
};

export const analysisFields = [
  {
    id: 'moisture',
    label: '수분 함량',
    unit: '%',
  },
  {
    id: 'lead',
    label: '중금속 Pb',
    unit: 'mg/L',
  },
  {
    id: 'chlorine',
    label: '염소 함량',
    unit: 'ppm',
  },
  {
    id: 'calorific',
    label: '발열량',
    unit: 'kcal/kg',
  },
  {
    id: 'flashpoint',
    label: '인화점',
    unit: '℃',
  },
];

export const progressSteps = ['폐기물 등록', '분류 확정', '업체 선정', '처리 진행', '완료'];

export function hasConfirmedCode(waste) {
  return ['확정', '처리 진행', '완료'].includes(waste.status);
}

export function stageIndex(e) {
  return {
    '문진 중': 0,
    후보: 1,
    확정: 1,
    '분석 대기': 2,
    '처리 진행': 3,
    완료: 4,
  }[e];
}
