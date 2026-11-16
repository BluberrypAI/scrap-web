import { Suspense, lazy, useMemo, useState } from 'react';
import '../../pages/map/ResourceMapPage.css';
import { facilityMapData, validLocation } from './route-result.js';

// 순환자원지도와 같은 Mapbox 지도. 지도 라이브러리가 커서 이 화면에서도 나중에 불러온다
const ResourceMapbox = lazy(() =>
  import('../../pages/map/ResourceMapbox.jsx').then((module) => ({ default: module.ResourceMapbox })),
);

/** 공정 후보(options)의 업체를 지도 표시용으로 모은다. 같은 업체가 여러 공정에 있으면 한 번만 */
export function mapFactories(options) {
  return facilityMapData(options).factories;
}

// 후보 업체 위치 지도. 업체를 누르면 아래 목록의 해당 카드로 이동하고 강조한다
export function FacilityMap({ options, candidateCount, origin = null, originLabel = '', selectedKey, onSelect }) {
  const [mapState, setMapState] = useState('loading');
  const { factories, total } = useMemo(() => facilityMapData(options), [options]);
  const count = candidateCount ?? total;
  const originPoint = useMemo(
    () => (validLocation(origin) ? { ...origin, label: originLabel ? '우리 사업장' : '출발 사업장' } : null),
    [origin, originLabel],
  );
  // 업체는 있지만 좌표만 없는 경우에도 목록 이용 방법을 알려 준다.
  if (!factories.length && !originPoint) return count > 0
    ? <p className="wf-card wf-muted">후보 업체 {count}곳의 좌표를 확인하지 못했어요. 아래 목록에서 업체와 근거를 확인해 주세요.</p>
    : null;

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
            label="처리 후보 업체 위치 지도" onStateChange={setMapState}
          />
        </Suspense>
      </div>
      <p className="wf-map-note">
        {!factories.length
          ? count > 0 ? `후보 업체 ${count}곳의 좌표가 없어 출발 사업장만 표시해요. 업체는 아래 목록에서 확인해 주세요.`
            : '출발 사업장만 표시해요. 연결된 후보가 없어 목적지와 경로는 아직 표시하지 않아요.'
          : mapState === 'ready'
          ? `전체 후보 업체 ${count}곳 중 지도 표시 대상 ${factories.length}곳을 표시했어요. 업체를 누르면 아래 목록에서 볼 수 있어요.`
          : `위치가 확인된 업체는 ${factories.length}곳이에요. 지도가 준비되지 않으면 아래 목록을 이용해 주세요.`}
        {!originPoint && ' 사업장 좌표가 없어 거리 순위는 표시하지 않아요.'}
      </p>
    </div>
  );
}
