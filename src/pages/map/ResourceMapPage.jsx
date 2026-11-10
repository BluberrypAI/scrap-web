import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { handlers } from '../../data/handlers.js';
import './ResourceMapPage.css';

const ResourceMapbox = lazy(() => import('./ResourceMapbox.jsx')
  .then((module) => ({ default: module.ResourceMapbox })));

const regionOptions = ['전체', '수도권', '충청권', '영남권', '호남권'];
const materialOptions = ['전체', '폐유', '폐합성수지', '폐금속', '슬러지'];
const typeOptions = ['전체', '중간처분업', '중간재활용업', '종합재활용업', '최종재활용업'];
const regionQueries = [
  [['경기', '경기도', '서울', '인천', '수도권'], '수도권'],
  [['충청', '충북', '충남', '대전', '세종', '청주'], '충청권'],
  [['경상', '경북', '경남', '부산', '대구', '울산', '김해', '영남'], '영남권'],
  [['전라', '전북', '전남', '광주', '여수', '호남'], '호남권'],
];
const materialQueries = [
  [['폐유', '윤활유', '유기용제'], '폐유'],
  [['합성수지', '플라스틱', '폐비닐'], '폐합성수지'],
  [['금속', '전자제품', '고철'], '폐금속'],
  [['슬러지', '오니'], '슬러지'],
  [['고무', '타이어'], '폐고무'],
  [['촉매'], '폐촉매'],
];

function queryValues(query, groups) {
  const compact = query.replaceAll(' ', '');
  return groups.filter(([terms]) => terms.some((term) => compact.includes(term)))
    .map(([, value]) => value);
}

function matchesNaturalLanguage(factory, query) {
  if (!query) return true;
  const regions = queryValues(query, regionQueries);
  const materials = queryValues(query, materialQueries);
  const types = typeOptions.slice(1).filter((type) => query.includes(type.replace('업', '')));
  if (regions.length && !regions.includes(factory.region)) return false;
  if (materials.length && !materials.some((material) => factory.materials.includes(material)
    || (material === '폐금속' && factory.materials.includes('금속'))
    || (material === '슬러지' && factory.materials.includes('슬러지')))) return false;
  if (types.length && !types.includes(factory.type)) return false;
  if (regions.length || materials.length || types.length) return true;

  const searchable = `${factory.name} ${factory.type} ${factory.location} ${factory.materials} ${factory.codes.join(' ')}`
    .replaceAll(' ', '');
  const words = query.split(/\s+/).filter((word) => word.length > 1
    && !['업체', '공장', '처리', '가능', '찾아줘', '보여줘', '있는', '에서'].includes(word));
  return words.length === 0 || words.some((word) => searchable.includes(word));
}

export function ResourceMapPage() {
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [region, setRegion] = useState('전체');
  const [material, setMaterial] = useState('전체');
  const [companyType, setCompanyType] = useState('전체');
  const [selectedId, setSelectedId] = useState(handlers[0]?.id);
  const [focusId, setFocusId] = useState(null);
  const resultRefs = useRef(new Map());
  const filteredHandlers = useMemo(() => handlers.filter((factory) => (
    (region === '전체' || factory.region === region)
    && (material === '전체' || factory.materials.includes(material)
      || (material === '폐금속' && factory.materials.includes('금속'))
      || (material === '슬러지' && factory.materials.includes('슬러지')))
    && (companyType === '전체' || factory.type === companyType)
    && matchesNaturalLanguage(factory, appliedQuery)
  )), [appliedQuery, companyType, material, region]);

  useEffect(() => {
    if (!filteredHandlers.some((factory) => factory.id === selectedId)) {
      setSelectedId(filteredHandlers[0]?.id || null);
    }
  }, [filteredHandlers, selectedId]);

  useEffect(() => {
    const selectedCard = resultRefs.current.get(selectedId);
    selectedCard?.scrollIntoView({
      behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [selectedId]);

  function submitSearch(event) {
    event.preventDefault();
    setFocusId(null);
    setAppliedQuery(query.trim());
  }

  function selectFactory(id) {
    setSelectedId(id);
    setFocusId(id);
  }

  function resetFilters() {
    setQuery('');
    setAppliedQuery('');
    setRegion('전체');
    setMaterial('전체');
    setCompanyType('전체');
    setFocusId(null);
  }

  return <main className="route-content map-page resource-network-page"
    data-layer-name="L1-ResourceMap">
    <section className="resource-map-hero">
      <div className="resource-map-hero-copy">
        <span className="resource-map-hero-mark" aria-hidden="true">
          <img src="/images/scrap-compass-2d-purple.png" alt="" />
        </span>
        <header className="route-heading resource-map-heading">
          <p>RESOURCE NETWORK</p>
          <h1>순환자원지도</h1>
          <strong className="resource-map-tagline">순환자원의 다음 목적지를 찾아보세요</strong>
          <span>지역과 폐기물 조건을 말하면 처리 가능한 업체를 지도에서 보여드려요.</span>
        </header>
      </div>
      <form className="map-search resource-map-search" onSubmit={submitSearch}>
        <Icon name="spark" size={21} />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-label="처리업체 자연어 검색"
          placeholder="예: 경기도에서 폐유를 처리할 수 있는 업체 찾아줘" />
        {query && <button className="resource-search-clear" type="button"
          onClick={() => { setQuery(''); setAppliedQuery(''); }} aria-label="검색어 지우기">×</button>}
        <button className="button button-primary" type="submit">지도에서 찾기</button>
      </form>
    </section>

    <section className="resource-map-layout" aria-label="순환자원 업체 검색 지도">
      <aside className="resource-map-sidebar">
        <div className="resource-filter-heading">
          <div><strong>검색 조건</strong><span>{filteredHandlers.length}곳</span></div>
          <button type="button" onClick={resetFilters}>초기화</button>
        </div>
        <div className="resource-filter-groups">
          <fieldset>
            <legend>지역</legend>
            <div>{regionOptions.map((option) => <button type="button" key={option}
              className={region === option ? 'is-active' : ''}
              onClick={() => { setRegion(option); setFocusId(null); }}>{option}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend>취급 자원</legend>
            <div>{materialOptions.map((option) => <button type="button" key={option}
              className={material === option ? 'is-active' : ''}
              onClick={() => { setMaterial(option); setFocusId(null); }}>{option}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend>업종</legend>
            <label>
              <span className="sr-only">업종 선택</span>
              <select value={companyType} onChange={(event) => {
                setCompanyType(event.target.value);
                setFocusId(null);
              }}>
                {typeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </fieldset>
        </div>

        <div className="resource-result-heading">
          <strong>{appliedQuery ? `“${appliedQuery}” 결과` : '업체 목록'}</strong>
        </div>
        <div className="resource-result-list">
          {filteredHandlers.map((factory) => <article key={factory.id}
            ref={(node) => {
              if (node) resultRefs.current.set(factory.id, node);
              else resultRefs.current.delete(factory.id);
            }}
            className={`resource-result-card${selectedId === factory.id ? ' is-selected' : ''}`}>
            <button type="button" onClick={() => selectFactory(factory.id)}>
              <span className="resource-result-icon"><Icon name="building" size={15} /></span>
              <span className="resource-result-copy">
                <strong>{factory.name}</strong>
                <small>{factory.type} · {factory.location}</small>
                <em>{factory.materials}</em>
              </span>
            </button>
            {selectedId === factory.id && <a href={`/map/${factory.id}`}>
              업체 상세 보기 <Icon name="arrow" size={13} />
            </a>}
          </article>)}
          {!filteredHandlers.length && <div className="resource-empty-result">
            <Icon name="map" size={24} />
            <strong>조건에 맞는 업체가 없어요</strong>
            <span>검색어나 필터를 조금 넓혀 보세요.</span>
            <button type="button" onClick={resetFilters}>전체 업체 보기</button>
          </div>}
        </div>
      </aside>

      <div className="resource-map-stage">
        <Suspense fallback={<div className="resource-map-state"><span /><p>지도를 불러오는 중이에요.</p></div>}>
          <ResourceMapbox factories={filteredHandlers} selectedId={selectedId}
            focusId={focusId} onSelect={selectFactory} />
        </Suspense>
      </div>
    </section>
  </main>;
}
