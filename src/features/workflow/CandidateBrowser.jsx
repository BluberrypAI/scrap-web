import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { ProcessOption } from './FacilityCard.jsx';
import { FacilityMap, mapFactories } from './FacilityMap.jsx';
import { candidateMapOptions, validLocation } from './route-result.js';
import './candidates.css';

// The map and cards use the same filtered set; counts refer to distinct facilities.
export function CandidateBrowser({ options = [], reviews, origin, originLabel, selectedKey, onSelect, renderAction, renderExtra }) {
  const [query, setQuery] = useState('');
  const [process, setProcess] = useState('');
  const [sort, setSort] = useState('default');
  const term = query.trim().toLocaleLowerCase();
  const visible = options.filter((o) => !process || o.transition_key === process).map((option) => ({
    ...option,
    facilities: (option.facilities || []).filter((f) => `${f.label} ${f.region || ''}`.toLocaleLowerCase().includes(term)).sort((a, b) => {
      if (sort === 'distance') return (a.straight_line_distance_km ?? Infinity) - (b.straight_line_distance_km ?? Infinity);
      if (sort === 'name') return a.label.localeCompare(b.label, 'ko');
      return 0;
    }),
  })).filter((option) => !term || option.facilities.length > 0);
  const count = new Set(visible.flatMap((o) => o.facilities.map((f) => f.facility_key))).size;
  const mapOptions = candidateMapOptions(visible, origin, selectedKey);
  const hasMap = validLocation(origin) || mapFactories(mapOptions).length > 0;
  return (
    <section className="candidate-browser" aria-label="처리 업체 후보">
      <div className="candidate-heading"><div><span className="candidate-eyebrow">처리 경로 · 업체 후보</span><h2>다음 공정의 업체 <span>{count}곳</span></h2><p>실제 반입 가능 여부는 업체 검토와 확인을 거쳐 결정됩니다.</p></div></div>
      <div className="candidate-browser-toolbar"><div className="candidate-controls">
        <label className="candidate-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input aria-label="업체명 또는 지역 검색" placeholder="업체명 또는 지역으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <select aria-label="업체 정렬" value={sort} onChange={(e) => setSort(e.target.value)}><option value="default">기본 순</option><option value="distance">가까운 순 · 직선거리</option><option value="name">이름 순</option></select>
      </div>
      <div className="candidate-filters" role="group" aria-label="공정 필터">
        <button type="button" aria-pressed={!process} onClick={() => setProcess('')}>전체 공정</button>
        {options.map((o) => <button key={o.transition_key} type="button" aria-pressed={process === o.transition_key} onClick={() => setProcess(o.transition_key)}>{o.label}</button>)}
      </div></div>
      <div className={`candidate-layout${hasMap ? '' : ' without-map'}`}>
        <div className="candidate-results">
          {count === 0 && <div className="candidate-empty"><Icon name="building" size={30} /><h3>{term ? '검색 결과가 없어요' : '표시할 후보 업체가 없어요'}</h3><p>{term ? '다른 업체명이나 지역으로 찾아보세요.' : '다른 공정을 선택하거나 업체 명부를 확인해 주세요.'}</p>{(term || process) && <button className="button button-quiet" type="button" onClick={() => { setQuery(''); setProcess(''); }}>필터 초기화</button>}</div>}
          {visible.map((option) => <div key={option.transition_key}>
            <ProcessOption option={option} reviews={reviews} selectedKey={selectedKey} onSelect={onSelect} renderAction={renderAction} />
            {renderExtra?.(option)}
          </div>)}
        </div>
        {hasMap && <aside className="candidate-map-panel"><div className="candidate-map-heading"><Icon name="map" size={18} /><strong>업체 위치</strong></div><p className="wf-muted">{validLocation(origin) ? '현재 검색 결과에서 가까운 최대 5곳 · 직선거리 기준' : '위치가 확인된 최대 5곳 · 거리 순위 없음'}{selectedKey && ' · 선택한 업체 포함'}. 목록과 AI 검토에는 나머지 후보도 포함돼요.</p><FacilityMap options={mapOptions} candidateCount={count} origin={origin} originLabel={originLabel} selectedKey={selectedKey} onSelect={onSelect} />{originLabel && <p className="candidate-origin"><Icon name="building" size={16} />출발 사업장 · {originLabel}</p>}</aside>}
      </div>
    </section>
  );
}
