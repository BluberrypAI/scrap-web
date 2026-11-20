import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { CONCERN_CATEGORY } from './labels.js';
import { ProcessOption } from './FacilityCard.jsx';
import { FacilityMap, mapFactories } from './FacilityMap.jsx';
import { candidateMapOptions, validLocation, comparisonDistance, distanceBasis } from './route-result.js';
import './candidates.css';

// The map and cards use the same filtered set; counts refer to distinct facilities.
export function CandidateBrowser({ options = [], reviews, origin, originLabel, selectedKey, onSelect, renderAction, renderExtra }) {
  const [query, setQuery] = useState('');
  const [activeProcess, setActiveProcess] = useState(options[0]?.transition_key || '');
  const [sort, setSort] = useState('distance');
  const resultsRef = useRef(null);
  const processNavRef = useRef(null);
  const term = query.trim().toLocaleLowerCase();
  const basis = distanceBasis(options);
  const visible = options.map((option) => ({
    ...option,
    facilities: (option.facilities || []).filter((f) => `${f.label} ${f.region || ''}`.toLocaleLowerCase().includes(term)).sort((a, b) => {
      if (sort === 'distance') return comparisonDistance(a, basis) - comparisonDistance(b, basis);
      if (sort === 'name') return a.label.localeCompare(b.label, 'ko');
      return 0;
    }),
  })).filter((option) => option.facilities.length > 0);
  const visibleKeys = visible.map((option) => option.transition_key).join('|');
  useEffect(() => {
    const update = () => {
      const sections = [...resultsRef.current?.querySelectorAll('[data-process-key]') || []];
      if (!sections.length) { setActiveProcess(''); return; }
      const current = sections.filter((section) => section.getBoundingClientRect().top <= 180).at(-1) || sections[0];
      setActiveProcess(current.dataset.processKey);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [visibleKeys, sort, term]);
  useEffect(() => {
    const list = processNavRef.current;
    const button = [...list?.querySelectorAll('button') || []].find((item) => item.dataset.processKey === activeProcess);
    if (!button) return;
    const left = button.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
    if (left < list.scrollLeft || left + button.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 12), behavior: 'smooth' });
    }
  }, [activeProcess]);
  function jumpToProcess(key) {
    setActiveProcess(key);
    [...resultsRef.current?.querySelectorAll('[data-process-key]') || []]
      .find((section) => section.dataset.processKey === key)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const count = new Set(visible.flatMap((o) => o.facilities.map((f) => f.facility_key))).size;
  const ordered = visible.flatMap(option => option.facilities.map(facility => ({ option, facility }))).sort((a, b) => {
    if (sort === 'name') return a.facility.label.localeCompare(b.facility.label, 'ko');
    if (sort === 'distance') return comparisonDistance(a.facility, basis) - comparisonDistance(b.facility, basis)
      || a.facility.facility_key.localeCompare(b.facility.facility_key);
    return 0;
  });
  const mapOptions = candidateMapOptions(visible, origin, selectedKey, basis);
  const hasMap = validLocation(origin) || mapFactories(mapOptions).length > 0;
  return (
    <section className="candidate-browser" aria-label="처리 업체 후보">
      <div className="candidate-heading"><div><span className="candidate-eyebrow">처리 경로 · 업체 후보</span><h2>선택 가능한 다음 공정 {visible.length}개 · 후보 업체 <span>{count}곳</span></h2><p>표시된 공정을 모두 순서대로 거치는 것은 아니에요. 현재 물량에서 이어질 수 있는 공정 후보이며, 실제 반입 가능 여부는 업체 검토 후 결정돼요.</p></div></div>
      {options.some(option => option.facilities?.length) && <div className="candidate-browser-toolbar"><div className="candidate-controls">
        <label className="candidate-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input aria-label="업체명 또는 지역 검색" placeholder="업체명 또는 지역으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <select aria-label="업체 정렬" value={sort} onChange={(e) => setSort(e.target.value)}><option value="default">기본 순</option><option value="distance">가까운 순 · {basis === 'road' ? '도로거리' : '직선거리'}</option><option value="name">이름 순</option></select>
      </div></div>}
      {visible.length > 0 && <nav className="candidate-process-nav" aria-label="공정별 업체 바로가기">
        <span className="candidate-process-nav-label">보고 있는 후보</span>
        <div className="candidate-filters" ref={processNavRef}>
          {visible.map((option, index) => {
            const preparation = ['sorting', 'cleaning', 'drying'].filter(category => option.facilities.some(f =>
              reviews?.[f.capability_key]?.lot_review?.concerns?.some(c => c.category === category)));
            return <button key={option.transition_key} data-process-key={option.transition_key} type="button" aria-current={activeProcess === option.transition_key ? 'step' : undefined} onClick={() => jumpToProcess(option.transition_key)}><span>{String(index + 1).padStart(2, '0')}</span>{option.label}
              {preparation.length > 0 && <small className="candidate-preparation">{preparation.map(k => CONCERN_CATEGORY[k]).join('·')} 확인</small>}
            </button>;
          })}
        </div>
      </nav>}
      <div className={`candidate-layout${hasMap ? '' : ' without-map'}`}>
        <div className="candidate-results" ref={resultsRef}>
          {count === 0 && <div className="candidate-empty"><Icon name="building" size={30} /><h3>{term ? '검색 결과가 없어요' : '표시할 후보 업체가 없어요'}</h3><p>{term ? '다른 업체명이나 지역으로 찾아보세요.' : '업체 명부를 확인해 주세요.'}</p>{term && <button className="button button-quiet" type="button" onClick={() => setQuery('')}>검색 초기화</button>}</div>}
          {ordered.map(({ option, facility }) => <div className="candidate-process-section" data-process-key={option.transition_key} key={facility.capability_key}>
            <ProcessOption option={{ ...option, facilities: [facility] }} index={options.findIndex((item) => item.transition_key === option.transition_key)} reviews={reviews} selectedKey={selectedKey} onSelect={onSelect} renderAction={renderAction} />
          </div>)}
          {visible.map(option => <div key={`extra-${option.transition_key}`}>{renderExtra?.(option)}</div>)}
        </div>
        {hasMap && <aside className="candidate-map-panel"><div className="candidate-map-heading"><Icon name="map" size={18} /><strong>업체 위치</strong></div><FacilityMap options={mapOptions} origin={origin} originLabel={originLabel} selectedKey={selectedKey} onSelect={onSelect} /></aside>}
      </div>
    </section>
  );
}
