// Local presentation data only. It is never used for a real workplace route.
const routes = {
  aluminium: [
    ['al-can-sort-demo', '선별·압축', '압축 캔', '처리업체 1', 'sorting'],
    ['al-can-melt-demo', '용해·주조', '재생 알루미늄', '처리업체 2', 'recycling'],
    ['al-can-demand-demo', '원료 공급', '재생 원료', '수요업체', 'manufacturing'],
  ],
  PP: [
    ['pp-sort-demo', '선별·파쇄', '파쇄품', '처리업체 1', 'sorting'],
    ['pp-pellet-demo', '세척·펠렛화', '재생 펠렛', '처리업체 2', 'recycling'],
    ['pp-demand-demo', '원료 공급', '재생 펠렛', '수요업체', 'manufacturing'],
  ],
  PE: [
    ['pe-sort-demo', '선별·파쇄', '파쇄품', '처리업체 1', 'sorting'],
    ['pe-pellet-demo', '세척·펠렛화', '재생 펠렛', '처리업체 2', 'recycling'],
    ['pe-demand-demo', '원료 공급', '재생 펠렛', '수요업체', 'manufacturing'],
  ],
  PET: [
    ['pet-sort-demo', '선별·파쇄', '플레이크', '처리업체 1', 'sorting'],
    ['pet-recycle-demo', '세척·재생', '재생 원료', '처리업체 2', 'recycling'],
    ['pet-demand-demo', '원료 공급', '재생 원료', '수요업체', 'manufacturing'],
  ],
  alkali: [
    ['alkali-neutralize-demo', '중화 처리', '중화 처리물', '처리업체 1', 'recycling'],
    ['alkali-recover-demo', '회수·재활용', '재활용 원료', '처리업체 2', 'recycling'],
    ['alkali-demand-demo', '원료 공급', '재활용 원료', '수요업체', 'manufacturing'],
  ],
};

export function demoRouteStops(material) {
  return (routes[material] || []).map(([key, process, output, facility, kind]) => ({
    facility_key: key, label: facility, process, output, kind,
  }));
}
