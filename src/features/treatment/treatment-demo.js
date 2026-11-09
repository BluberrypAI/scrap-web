// Local presentation data only. It is never used for a real workplace route.
const routes = {
  aluminium: [
    ['al-can-sort-demo', '선별·압축', '압축 캔', '처리업체 1', 'sorting', '충남 당진', 36.893, 126.629, '당진 금속선별센터'],
    ['al-can-melt-demo', '용해·주조', '재생 알루미늄', '처리업체 2', 'recycling', '경북 김천', 36.139, 128.114, '김천 알루미늄 재생공장'],
    ['al-can-demand-demo', '원료 공급', '재생 원료', '수요업체', 'manufacturing', '울산', 35.539, 129.311, '울산 소재 제조공장'],
  ],
  PP: [
    ['pp-sort-demo', '선별·파쇄', '파쇄품', '처리업체 1', 'sorting', '강원 원주', 37.342, 127.92, '원주 자원선별센터'],
    ['pp-pellet-demo', '세척·펠렛화', '재생 펠렛', '처리업체 2', 'recycling', '충북 청주', 36.642, 127.489, '청주 재생원료공장'],
    ['pp-demand-demo', '원료 공급', '재생 펠렛', '수요업체', 'manufacturing', '대전', 36.351, 127.385, '대전 수요공장'],
  ],
  PE: [
    ['pe-sort-demo', '선별·파쇄', '파쇄품', '처리업체 1', 'sorting', '강원 원주', 37.342, 127.92, '원주 자원선별센터'],
    ['pe-pellet-demo', '세척·펠렛화', '재생 펠렛', '처리업체 2', 'recycling', '충북 청주', 36.642, 127.489, '청주 재생원료공장'],
    ['pe-demand-demo', '원료 공급', '재생 펠렛', '수요업체', 'manufacturing', '대전', 36.351, 127.385, '대전 수요공장'],
  ],
  PET: [
    ['pet-sort-demo', '선별·파쇄', '플레이크', '처리업체 1', 'sorting', '경기 수원', 37.263, 127.029, '수원 자원선별센터'],
    ['pet-recycle-demo', '세척·재생', '재생 원료', '처리업체 2', 'recycling', '대구', 35.871, 128.601, '대구 PET 재생공장'],
    ['pet-demand-demo', '원료 공급', '재생 원료', '수요업체', 'manufacturing', '부산', 35.18, 129.075, '부산 원료 수요공장'],
  ],
  alkali: [
    ['alkali-neutralize-demo', '중화 처리', '중화 처리물', '처리업체 1', 'recycling', '전북 익산', 35.948, 126.957, '익산 중화처리센터'],
    ['alkali-recover-demo', '회수·재활용', '재활용 원료', '처리업체 2', 'recycling', '전북 전주', 35.824, 127.148, '전주 자원회수공장'],
    ['alkali-demand-demo', '원료 공급', '재활용 원료', '수요업체', 'manufacturing', '전남 여수', 34.761, 127.663, '여수 원료 수요공장'],
  ],
};

export function demoRouteStops(material) {
  return (routes[material] || []).map(([key, process, output, facility, kind,
    region, latitude, longitude, mapLabel]) => ({
    facility_key: key, label: facility, process, output, kind, region, mapLabel,
    coordinates: { latitude, longitude },
  }));
}
