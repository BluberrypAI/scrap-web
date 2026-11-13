import { Suspense, lazy, useMemo } from 'react';
import '../../pages/map/ResourceMapPage.css';

// 순환자원지도와 같은 Mapbox 지도. 지도 라이브러리가 커서 이 화면에서도 나중에 불러온다
const ResourceMapbox = lazy(() =>
  import('../../pages/map/ResourceMapbox.jsx').then((module) => ({ default: module.ResourceMapbox })),
);

/** 공정 후보(options)의 업체를 지도 표시용으로 모은다. 같은 업체가 여러 공정에 있으면 한 번만 */
export function mapFactories(options) {
  const seen = new Map();
  for (const option of options || []) {
    for (const f of option.facilities || []) {
      if (!f.location || seen.has(f.facility_key)) continue;
      seen.set(f.facility_key, {
        id: f.facility_key,
        name: f.label,
        location: f.region,
        latitude: f.location.latitude,
        longitude: f.location.longitude,
      });
    }
  }
  return [...seen.values()];
}

// 후보 업체 위치 지도. 업체를 누르면 아래 목록의 해당 카드로 이동하고 강조한다
export function FacilityMap({ options, origin = null, originLabel = '', selectedKey, onSelect }) {
  const factories = useMemo(() => mapFactories(options), [options]);
  const originPoint = useMemo(
    () => (origin ? { ...origin, label: originLabel ? '우리 사업장' : '출발 사업장' } : null),
    [origin, originLabel],
  );
  const total = (options || []).reduce((n, o) => n + (o.facilities?.length || 0), 0);
  if (!factories.length) return null;

  function select(key) {
    onSelect(key);
    document.getElementById(`facility-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="wf-map-block">
      <div className="wf-map resource-map-stage">
        <Suspense fallback={<div className="resource-map-state"><span /><p>지도를 불러오는 중이에요.</p></div>}>
          <ResourceMapbox
            factories={factories}
            selectedId={selectedKey}
            focusId={selectedKey}
            onSelect={select}
            origin={originPoint}
            label="처리 후보 업체 위치 지도"
          />
        </Suspense>
      </div>
      <p className="wf-map-note">
        후보 업체 {total}곳 중 위치가 확인된 {factories.length}곳을 표시했어요. 업체를 누르면 아래 목록에서 볼 수 있어요.
        {!origin && ' 사업장 좌표가 없어 거리 순위는 표시하지 않아요.'}
      </p>
    </div>
  );
}
