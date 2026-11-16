import { lazy, Suspense } from 'react';
import '../pages/map/ResourceMapPage.css';
const Map = lazy(() => import('../pages/map/ResourceMapbox.jsx').then(m => ({ default: m.ResourceMapbox })));

export function SiteLocationPicker({ value, onChange, disabled = false }) {
  return <fieldset disabled={disabled} style={{ border: '1px solid #ded8ed', borderRadius: 16, padding: 16, minWidth: 0 }}>
    <legend>사업장 위치 확인 · 선택</legend>
    <p>지도를 확대해 실제 사업장을 눌러 주세요. 이 위치에서 가까운 업체를 비교해요.</p>
    <div className="resource-map-stage" style={{ height: 280, minHeight: 280, position: 'relative' }}>
      <Suspense fallback={<p>지도 준비 중…</p>}>
        <Map factories={[]} origin={value ? { ...value, label: '우리 사업장' } : null}
          onPick={disabled ? undefined : onChange} label="사업장 위치 선택 지도" />
      </Suspense>
    </div>
    <p role="status">{value ? `선택 위치: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : '미선택 · 주소만으로 거리 순위를 정하지 않아요.'}</p>
    {value && <button type="button" className="button button-quiet button-small" onClick={() => onChange(null)}>선택 해제</button>}
  </fieldset>;
}
