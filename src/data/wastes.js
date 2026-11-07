import { demoWorkplace, restoreCases } from '../features/treatment/treatment-state.js';
import { demoRouteStops } from '../features/treatment/treatment-demo.js';

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
    classifiedAt: '2026-10-29T00:00:00Z',
    treatmentInput: { material: 'alkali', input_form: 'liquid', ...demoWorkplace.routeOrigin },
    routePhase: 'processing',
    routeStopIndex: 1,
  },
  {
    id: 'plastic-film',
    name: '폐플라스틱 필름',
    code: '51-03-01',
    status: '처리 진행',
    updatedAt: '2026. 11. 07',
    category: '합성수지',
    classifiedAt: '2026-11-07T00:00:00Z',
    treatmentInput: { material: 'PE', input_form: 'film', ...demoWorkplace.routeOrigin },
    routePhase: 'transporting',
    routeLegIndex: 0,
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
    name: '사용 후 알루미늄 캔',
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
          name: '폐합성수지 · PP 사출 잔재',
          classifiedAt: '2026-11-01T00:00:00Z',
          treatmentInput: { material: 'PP', input_form: 'scrap', ...demoWorkplace.routeOrigin },
        }
      : waste,
  ),
]);

export const statusMessages = {
  '문진 중': '문진 5/8 · 수분 함량 질문에서 멈췄어요',
  후보: '분류 후보 중 하나를 확정해 주세요',
  확정: '처리 경로를 확인해 주세요',
  '분석 대기': '분석 결과 입력을 기다리고 있어요',
  '처리 진행': '처리업체에서 처리 중이에요',
  완료: '처리가 완료됐어요',
};

export function wasteStatusMessage(waste) {
  if (waste.status === '확정') {
    const nextFacility = demoRouteStops(waste.treatmentInput?.material)[0]?.label || '처리업체 1';
    return `${nextFacility}의 처리 가능 여부 확인을 기다리고 있어요`;
  }
  if (waste.status !== '처리 진행' || !waste.routePhase) return statusMessages[waste.status];
  const stops = demoRouteStops(waste.treatmentInput?.material);
  if (waste.routePhase === 'transporting') {
    const destination = stops[waste.routeLegIndex || 0]?.label || '다음 처리업체';
    return `${destination}로 운송 중이에요`;
  }
  const stop = stops[waste.routeStopIndex || 0];
  return stop ? `${stop.label}에서 ${stop.process} 중이에요` : statusMessages[waste.status];
}

export function wasteDisplayStatus(waste) {
  if (waste.routePhase === 'transporting') return '운송 중';
  if (waste.routePhase === 'processing') return '처리 중';
  if (waste.status === '확정') return '업체 확인 대기';
  return waste.status;
}

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
