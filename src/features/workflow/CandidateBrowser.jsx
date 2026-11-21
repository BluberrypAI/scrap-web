import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { CONCERN_CATEGORY } from './labels.js';
import { FacilityDetail, FacilityListItem } from './FacilityCard.jsx';
import { FacilityMap, mapFactories } from './FacilityMap.jsx';
import { ProcessDiscovery } from './ProcessDiscovery.jsx';
import { candidateMapOptions, validLocation, comparisonDistance, distanceBasis } from './route-result.js';
import './candidates.css';

const NARROW = '(max-width: 900px)';
const isNarrow = () => typeof window !== 'undefined' && window.matchMedia?.(NARROW).matches;

// 후보 목록(왼쪽)과 선택한 업체의 상세·지도(오른쪽). 지도와 목록은 같은 필터 결과를 쓴다.
// requestState(facility, result) → { tone, label }: 카드에 보일 요청 가능 여부
// renderAction(facility, result) → 상세의 '지금 할 일' 상자
// renderDetailExtra(facility) → 상세의 업체 안내 반입조건
// renderExtra(option) → 공정별 '더 찾아보기'(전국 명부 등)
export function CandidateBrowser({ options = [], reviews, origin, originLabel, requestState, renderAction, renderDetailExtra, renderExtra }) {
  const [query, setQuery] = useState('');
  const [activeProcess, setActiveProcess] = useState(options[0]?.transition_key || '');
  const [sort, setSort] = useState('distance');
  const [activeKey, setActiveKey] = useState(null);
  const [tab, setTab] = useState('detail');
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef(null);
  const processNavRef = useRef(null);
  const detailHeading = useRef(null);
  const sheetRef = useRef(null);
  const panelBody = useRef(null);
  const returnFocus = useRef(null);
  const panelId = useId();
  const term = query.trim().toLocaleLowerCase();
  const basis = distanceBasis(options);

  const byDistance = (a, b) => comparisonDistance(a, basis) - comparisonDistance(b, basis) || a.facility_key.localeCompare(b.facility_key);
  const groups = options.map((option, index) => ({
    option,
    index,
    facilities: (option.facilities || []).filter((f) => `${f.label} ${f.region || ''}`.toLocaleLowerCase().includes(term)).sort((a, b) => {
      if (sort === 'distance') return byDistance(a, b);
      if (sort === 'name') return a.label.localeCompare(b.label, 'ko');
      return 0;
    }),
  })).filter((group) => group.facilities.length > 0);
  if (sort === 'distance') groups.sort((a, b) => byDistance(a.facilities[0], b.facilities[0]));
  // 화면에 보이는 순서대로 번호를 붙인다(정렬을 바꾸면 번호도 따라 바뀜).
  groups.forEach((group, order) => { group.index = order; });

  const entries = groups.flatMap((group) => group.facilities.map((facility) => ({ group, facility, review: reviews?.[facility.capability_key] })));
  const statusOf = (entry) => requestState?.(entry.facility, entry.review) || null;
  const active = activeKey
    ? entries.find((entry) => entry.facility.capability_key === activeKey)
    : entries.find((entry) => statusOf(entry)?.tone === 'ready') || entries[0];
  const activeCapability = active?.facility.capability_key;
  const count = new Set(entries.map((entry) => entry.facility.facility_key)).size;
  const visibleOptions = groups.map((group) => ({ ...group.option, facilities: group.facilities }));
  const selectedFacilityKey = active?.facility.facility_key || null;
  const mapOptions = candidateMapOptions(visibleOptions, origin, selectedFacilityKey, basis);
  const mapCount = mapFactories(mapOptions).length;
  const hasMap = validLocation(origin) || mapCount > 0;
  const panelTab = hasMap && (tab === 'map' || (!activeKey && !active)) ? 'map' : 'detail';
  const visibleKeys = groups.map((group) => group.option.transition_key).join('|');
  const Panel = sheetOpen ? 'dialog' : 'aside';

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
  // 좁은 화면에서는 상세가 전체 화면으로 열린다. 열린 동안 뒤 화면은 스크롤하지 않는다.
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const dialog = sheetRef.current;
    dialog.showModal();
    document.documentElement.classList.add('candidate-sheet-open');
    detailHeading.current?.focus();
    const media = window.matchMedia(NARROW);
    const onResize = () => { if (!media.matches) setSheetOpen(false); };
    media.addEventListener('change', onResize);
    return () => {
      dialog.close();
      document.documentElement.classList.remove('candidate-sheet-open');
      media.removeEventListener('change', onResize);
    };
  }, [sheetOpen]);

  useEffect(() => { panelBody.current?.scrollTo(0, 0); }, [activeCapability, panelTab]);

  function jumpToProcess(key) {
    setActiveProcess(key);
    [...resultsRef.current?.querySelectorAll('[data-process-key]') || []]
      .find((section) => section.dataset.processKey === key)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function openSheet(nextTab) {
    returnFocus.current = document.activeElement;
    setTab(nextTab);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
    requestAnimationFrame(() => returnFocus.current?.focus?.());
  }
  function cancelSheet(event) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    closeSheet();
  }
  function activate(facility) {
    setActiveKey(facility.capability_key);
    setTab('detail');
    if (isNarrow()) openSheet('detail');
  }
  // 지도의 업체를 고르면 그 업체의 첫 공정 카드를 상세로 연다.
  // 이미 보고 있는 업체의 핀이면 지금 공정을 유지해 요청 대상(capability_key)이 바뀌지 않게 한다.
  function selectFromMap(facilityKey) {
    const entry = active?.facility.facility_key === facilityKey ? active
      : entries.find((item) => item.facility.facility_key === facilityKey);
    if (!entry) return;
    setActiveKey(entry.facility.capability_key);
    setTab('detail');
    if (!sheetOpen) document.getElementById(`facility-${entry.facility.capability_key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    requestAnimationFrame(() => detailHeading.current?.focus({ preventScroll: true }));
  }

  return (
    <section className="candidate-browser" aria-label="처리 업체 후보">
      <div className="candidate-heading"><div><span className="candidate-eyebrow">업체 후보</span><h2>{groups.length ? '업체를 비교하고 선택하세요' : '표시할 추천 업체가 없어요'}</h2><p>{groups.length ? `다음 공정 ${groups.length}가지 중 하나를 고를 수 있어요. 업체를 누르면 검토 근거와 인수 요청 가능 여부를 볼 수 있어요.` : '추가 후보를 확인하거나 현재 물량을 다시 검토해 주세요.'}</p></div></div>
      {options.some(option => option.facilities?.length) && <div className="candidate-browser-toolbar"><div className="candidate-controls">
        <label className="candidate-search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input aria-label="업체명 또는 지역 검색" placeholder="업체명 또는 지역으로 검색" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <select aria-label="업체 정렬" value={sort} onChange={(e) => setSort(e.target.value)}><option value="default">기본 순</option><option value="distance">공정별 가까운 순 · {basis === 'road' ? '도로거리' : '직선거리'}</option><option value="name">공정별 이름 순</option></select>
        {hasMap && <button type="button" className="candidate-map-toggle" onClick={() => openSheet('map')}><Icon name="map" size={16} />지도에서 보기</button>}
      </div></div>}
      {groups.length > 0 && <nav className="candidate-process-nav" aria-label="공정별 업체 바로가기">
        <span className="candidate-process-nav-label">보고 있는 후보</span>
        <div className="candidate-filters" ref={processNavRef}>
          {groups.map(({ option, index, facilities }) => {
            const preparation = ['sorting', 'cleaning', 'drying'].filter(category => facilities.some(f =>
              reviews?.[f.capability_key]?.lot_review?.concerns?.some(c => c.category === category)));
            return <button key={option.transition_key} data-process-key={option.transition_key} type="button" aria-current={activeProcess === option.transition_key ? 'step' : undefined} onClick={() => jumpToProcess(option.transition_key)}><span>{String(index + 1).padStart(2, '0')}</span>{option.label}
              {preparation.length > 0 && <small className="candidate-preparation">{preparation.map(k => CONCERN_CATEGORY[k]).join('·')} 확인</small>}
            </button>;
          })}
        </div>
      </nav>}
      <div className="candidate-workspace">
        <div className="candidate-results" ref={resultsRef}>
          {count === 0 && <div className="candidate-empty"><Icon name="building" size={30} /><h3>{term ? '검색 결과가 없어요' : '표시할 후보 업체가 없어요'}</h3><p>{term ? '다른 업체명이나 지역으로 찾아보세요.' : '업체 명부를 확인해 주세요.'}</p>{term && <button className="button button-quiet" type="button" onClick={() => setQuery('')}>검색 초기화</button>}</div>}
          {groups.map(({ option, index, facilities }) => <section className="candidate-process-section" data-process-key={option.transition_key} key={option.transition_key} aria-labelledby={`process-${option.transition_key}`}>
            <header className="candidate-process-head">
              <span className="process-step-number">공정 후보 {String(index + 1).padStart(2, '0')}</span>
              <h3 id={`process-${option.transition_key}`}>{option.label}<span className="process-count">{facilities.length}곳</span></h3>
              <p>{option.input_state?.label} → {option.output_state?.label}</p>
            </header>
            <ul className="facility-list">
              {facilities.map((facility) => {
                const entry = { group: null, facility, review: reviews?.[facility.capability_key] };
                return <FacilityListItem key={facility.capability_key} facility={facility} review={entry.review} status={statusOf(entry)}
                  active={active?.facility.capability_key === facility.capability_key} panelId={panelId} onActivate={activate} />;
              })}
            </ul>
            <ProcessDiscovery key={`${option.transition_key}-${option.web_search_form}`} option={option} />
            {renderExtra && <div className="candidate-process-more">{renderExtra(option)}</div>}
          </section>)}
        </div>
        {(activeKey || active || hasMap || sheetOpen) && <Panel ref={sheetRef} className="candidate-panel" id={panelId} aria-label="업체 상세와 위치"
          onCancel={sheetOpen ? cancelSheet : undefined}>
          <div className="candidate-panel-bar">
            <button type="button" className="candidate-panel-back" onClick={closeSheet}><Icon name="arrow" size={16} />후보 목록</button>
          </div>
          {hasMap && <div className="candidate-panel-tabs" role="group" aria-label="상세 보기 방식">
            {(active || activeKey) && <button type="button" aria-pressed={panelTab === 'detail'} onClick={() => setTab('detail')}><Icon name="building" size={15} />업체 상세</button>}
            <button type="button" aria-pressed={panelTab === 'map'} onClick={() => setTab('map')}><Icon name="map" size={15} />업체 위치 · {mapCount}곳</button>
          </div>}
          <div className="candidate-panel-body" ref={panelBody}>
            {panelTab === 'map' ? <div className="candidate-panel-map">
              <FacilityMap options={mapOptions} origin={origin} originLabel={originLabel} selectedKey={selectedFacilityKey} onSelect={selectFromMap} />
              <p className="candidate-panel-map-note">{mapCount ? '핀을 누르면 그 업체의 상세가 열려요.' : '표시할 후보 업체 위치가 없어 출발 사업장만 보여요.'}{originLabel ? ` 출발 사업장: ${originLabel}` : ''}</p>
            </div> : active ? <FacilityDetail key={activeCapability} option={active.group.option} index={active.group.index} facility={active.facility} review={active.review}
              headingRef={detailHeading}
              action={renderAction?.(active.facility, active.review)}
              extra={renderDetailExtra?.(active.facility)} /> : <div className="candidate-empty">
              <h3>{term ? '선택한 업체가 검색 결과에 없어요' : '선택한 업체가 현재 후보에 없어요'}</h3>
              <p>목록에서 검토할 업체를 선택해 주세요.</p>
            </div>}
          </div>
        </Panel>}
      </div>
    </section>
  );
}
