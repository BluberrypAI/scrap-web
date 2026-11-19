import { Suspense, lazy, useMemo } from 'react';
import '../../pages/map/ResourceMapPage.css';
import { facilityMapData, validLocation } from './route-result.js';

// 순환자원지도·가입 위치 선택과 같은 공통 지도 연결을 사용한다.
const ResourceMapbox = lazy(() =>
  import('../../pages/map/ResourceMapbox.jsx').then((module) => ({ default: module.ResourceMapbox })),
);

/** 공정 후보(options)의 업체를 지도 표시용으로 모은다. 같은 업체가 여러 공정에 있으면 한 번만 */
export function mapFactories(options) {
  return facilityMapData(options).factories;
}

// 후보 업체 위치 지도. 업체를 누르면 아래 목록의 해당 카드로 이동하고 강조한다
export function FacilityMap({ options, origin = null, originLabel = '', selectedKey, onSelect }) {
  const { factories } = useMemo(() => facilityMapData(options), [options]);
  const originPoint = useMemo(
    () => (validLocation(origin) ? { ...origin, label: originLabel ? '우리 사업장' : '출발 사업장' } : null),
    [origin, originLabel],
  );
  function select(key) {
    onSelect(key);
    document.getElementById(`facility-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="wf-map-block" aria-label={originLabel ? `출발 사업장: ${originLabel}` : undefined}>
      <div className="wf-map resource-map-stage">
        <Suspense fallback={<div className="resource-map-state"><span /><p>지도를 불러오는 중이에요.</p></div>}>
          <ResourceMapbox
            factories={factories}
            selectedId={selectedKey}
            focusId={selectedKey}
            onSelect={select}
            origin={originPoint}
            label={originLabel ? `처리 후보 업체 위치 지도 · 출발 사업장 ${originLabel}` : '처리 후보 업체 위치 지도'}
          />
        </Suspense>
      </div>
    </div>
  );
}
