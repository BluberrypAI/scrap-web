import { FacilityMap } from './FacilityMap.jsx';
import { facilityMapData, nearbyOptions } from './route-result.js';

export function NearbyCandidates({ options = [], origin, originLabel, selectedKey, onSelect, children }) {
  const { primary, other, unbound, ranked } = nearbyOptions(options, origin);
  return <>
    <p className="wf-muted">{ranked
      ? `${originLabel || '현재 보유 사업장'} 기준 · 위치가 확인된 후보 최대 5곳 · 직선거리 순`
      : <>사업장 위치가 없어 거리 순위를 정하지 않았어요. <a href="/data">사업장 위치 등록</a></>}</p>
    <FacilityMap options={primary} candidateCount={facilityMapData(options).total} origin={origin} originLabel={originLabel} selectedKey={selectedKey} onSelect={onSelect} />
    {primary.map(children)}
    {ranked && !primary.length && <p className="wf-muted">거리 비교가 가능한 업체 좌표가 없어요. 아래 후보의 근거를 확인해 주세요.</p>}
    {other.length > 0 && <details className="wf-more" open={!primary.length || undefined}>
      <summary>다른 후보 · 위치 확인이 필요한 업체</summary>
      <p className="wf-muted">이 업체들도 AI 검토에 포함돼요. 지도 표시 범위와 검토 범위는 달라요.</p>
      {other.map(children)}
    </details>}
    {unbound.length > 0 && <section aria-label="업체 확인이 필요한 공정">
      <h3>업체 확인이 필요한 공정</h3>
      <p className="wf-muted">공정 자료는 있지만, 현재 형태를 받는 업체가 아직 연결되지 않았어요. 업체 확인 후 인수 요청을 할 수 있어요.</p>
      {unbound.map(children)}
    </section>}
  </>;
}
