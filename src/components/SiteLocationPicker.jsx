import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import '../pages/map/ResourceMapPage.css';
import './SiteLocationPicker.css';
const Map = lazy(() => import('../pages/map/ResourceMapbox.jsx').then(m => ({ default: m.ResourceMapbox })));

export function SiteLocationPicker({ address = '', value, onChange, disabled = false }) {
  const [results, setResults] = useState(null);
  const [problem, setProblem] = useState('');
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState(null);
  const [selected, setSelected] = useState(null);
  const [coordinates, setCoordinates] = useState({ latitude: '', longitude: '' });
  const requestId = useRef(0);
  const latestAddress = useRef(address);
  latestAddress.current = address;
  useEffect(() => {
    requestId.current += 1;
    setResults(null); setProblem(''); setSelected(null); setSearching(false); setSource(null);
    setCoordinates({ latitude: '', longitude: '' });
    return () => { requestId.current += 1; };
  }, [address]);
  const search = async () => {
    const query = address.trim();
    if (query.length < 3) { setProblem('위 주소란에 주소나 장소명을 3자 이상 입력해 주세요.'); return; }
    const id = ++requestId.current;
    setSearching(true); setProblem(''); setResults(null);
    try {
      const data = await api.searchSiteLocation(query);
      if (id !== requestId.current || latestAddress.current.trim() !== query) return;
      if (!Array.isArray(data?.items)) throw new Error('검색 결과를 읽지 못했어요. 다시 검색해 주세요.');
      setResults(data.items);
      setSource({ provider: data.provider, attribution: data.attribution });
    } catch (error) {
      if (id === requestId.current && latestAddress.current.trim() === query)
        setProblem(error.message || '주소 검색에 연결하지 못했어요. 지도에서 위치를 지정할 수도 있어요.');
    } finally { if (id === requestId.current) setSearching(false); }
  };
  const pick = point => { setSelected(null); onChange(point); };
  return <fieldset disabled={disabled} className="site-location-picker">
    <legend>사업장 위치 확인 · 선택</legend>
    <p>주소로 검색해 사업장을 선택해 주세요. 핀을 움직여 실제 출입구로 조정할 수 있어요.</p>
    <button type="button" className="button button-quiet button-small" onClick={search}
      disabled={disabled || searching || address.trim().length < 3 || address.trim().length > 200}>
      {searching ? '주소 찾는 중…' : '입력한 주소로 지도 찾기'}
    </button>
    <p className="site-location-help">검색할 주소·장소명만 지도 검색 서비스에 전달돼요. 검색 결과가 없으면 건물명으로 검색하거나 지도에서 지정해 주세요.</p>
    {problem && <p role="alert" className="site-location-alert">{problem}</p>}
    {results?.length === 0 && <p role="status">일치하는 위치를 찾지 못했어요. 도로명·건물번호를 확인하거나 건물명으로 검색해 주세요. 지도에서 직접 지정할 수도 있어요.</p>}
    {!!results?.length && <div className="site-location-results" role="group" aria-label="사업장 주소 검색 결과">
      <p>같은 이름의 장소가 있을 수 있어요. 주소와 지도를 확인해 선택해 주세요.</p>
      {results.map((result, index) => <button type="button" key={`${result.latitude}:${result.longitude}:${index}`}
        aria-pressed={selected === index} disabled={disabled}
        onClick={() => { setSelected(index); onChange({ latitude: result.latitude, longitude: result.longitude }); }}>
        <strong>{result.label}</strong>
        <small>{result.precision === 'address' ? '주소 위치 · 실제 출입구를 확인해 주세요' : result.precision === 'area'
          ? '도로·지역 대표 위치 · 사업장으로 핀을 옮겨 주세요' : '장소 대표 위치 · 사업장과 출입구를 확인해 주세요'}</small>
      </button>)}
    </div>}
    <details className="site-location-manual">
      <summary>주소를 못 찾았나요? 확인한 좌표로 지정</summary>
      <p>다른 지도에서 확인한 사업장 위도·경도를 입력하고 핀 위치를 확인해 주세요.</p>
      <label>위도<input type="number" step="any" value={coordinates.latitude}
        onChange={e => setCoordinates({ ...coordinates, latitude: e.target.value })} /></label>
      <label>경도<input type="number" step="any" value={coordinates.longitude}
        onChange={e => setCoordinates({ ...coordinates, longitude: e.target.value })} /></label>
      <button type="button" className="button button-quiet button-small" onClick={() => {
        const latitude = Number(coordinates.latitude), longitude = Number(coordinates.longitude);
        if (!coordinates.latitude || !coordinates.longitude || !Number.isFinite(latitude) || !Number.isFinite(longitude)
          || latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) {
          setProblem('국내 사업장의 위도(33~39), 경도(124~132)를 확인해 주세요.'); return;
        }
        setProblem(''); pick({ latitude, longitude });
      }}>좌표로 위치 지정</button>
    </details>
    <div className="resource-map-stage" style={{ height: 300, minHeight: 300, position: 'relative' }}>
      <Suspense fallback={<p>지도 준비 중…</p>}>
        <Map factories={[]} origin={value ? { ...value, label: '우리 사업장' } : null}
          onPick={disabled ? undefined : pick} label="사업장 위치 선택 지도" />
      </Suspense>
    </div>
    <p role="status">{value ? `선택 위치: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} · 저장하면 이 위치를 거리 비교에 사용해요.` : '위치 미선택 · 검색 결과를 선택하거나 지도를 눌러 주세요.'}</p>
    {value && <button type="button" className="button button-quiet button-small" onClick={() => pick(null)}>선택 해제</button>}
    {source && <p className="site-location-help">검색 데이터: {source.provider} · {source.attribution}</p>}
  </fieldset>;
}
