/** @jsxRuntime classic */
/** @jsx h */
import { beginStep, completeStep, demoWorkplace, finishCase, getTreatmentCase, loadCase, newCase, storeCase } from './treatment-state.js';
import { recordEvidence } from './treatment-evidence.js';
import { createEvidenceUI } from './treatment-evidence-ui.jsx';
import { navigate } from '../../lib/router.js';
import './treatment.css';

const forms = {
  PP: [['scrap', '사출 잔재·스크랩'], ['rigid', '경질 조각'], ['film', '필름'],
    ['shredded', '파쇄품'], ['pellet', '펠렛']],
  PE: [['scrap', '스크랩'], ['rigid', '경질 조각'], ['film', '필름'],
    ['shredded', '파쇄품'], ['pellet', '펠렛']],
  PET: [['bottle', 'PET 병'], ['bale', '압축 베일'], ['flake', '플레이크']],
  aluminium: [['can', '사용 후 알루미늄 캔']],
};
const materialLabels = { PP: 'PP', PE: 'PE', PET: 'PET', aluminium: '알루미늄' };

function stamp(value) {
  return new Date(value).toLocaleString('ko-KR');
}

function routeOrigin(value) {
  return value.completed.length ? value.completed.at(-1).location : value.input.origin;
}

async function requestNext(value, signal) {
  const response = await fetch('/api/treatment/next-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      waste_code: value.input.waste_code,
      material: value.input.material,
      input_form: value.input.input_form,
      origin: routeOrigin(value),
      completed_transitions: value.completed.map((step) => step.transition_key),
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status) {
    throw new Error(result?.detail?.message || '공정 엔진에 연결하지 못했어요. 실행 상태를 확인해 주세요.');
  }
  return result;
}

// React is passed in from ./index.js, which exposes the created components.
export function createTreatmentUI(React) {
  const { createElement: h, useEffect, useRef, useState } = React;
  const { EvidenceTrail, EvidenceReport } = createEvidenceUI(React);

  function SurveyMaterial({ onAnswer }) {
    const [material, setMaterial] = useState('');
    const [form, setForm] = useState('');
    return <form className="treatment-confirm" onSubmit={(event) => {
      event.preventDefault();
      onAnswer({ material, input_form: form });
    }}>
      <h2>어떤 수지이고 어떤 형태인가요?</h2>
      <p>같은 폐합성수지 분류 안에서도 재질과 형태에 따라 이어지는 공정이 달라요.</p>
      <div className="treatment-fields">
        <label>재질<select required value={material} onChange={(e) => {
          setMaterial(e.target.value);
          setForm('');
        }}>
          <option value="">선택</option>
          {['PP', 'PE', 'PET'].map((key) => <option key={key} value={key}>{materialLabels[key]}</option>)}
        </select></label>
        <label>현재 형태<select required value={form} disabled={!material} onChange={(e) => setForm(e.target.value)}>
          <option value="">선택</option>
          {(forms[material] || []).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
      <button className="button button-primary" type="submit" disabled={!material || !form}>
        분류 결과 보기
      </button>
    </form>;
  }

  function Confirm({ id, input }) {
    const [error, setError] = useState('');
    function save() {
      try {
        if (!loadCase(id)) {
          const { material, input_form } = input;
          const formLabel = forms[material].find(([key]) => key === input_form)[1];
          const caseName = material === 'aluminium'
            ? formLabel
            : `폐합성수지 · ${materialLabels[material]} ${formLabel}`;
          storeCase(newCase(id, caseName, {
            ...input, waste_code: '51-03-01', ...demoWorkplace.routeOrigin,
          }));
        }
        navigate(`/wastes?created=${encodeURIComponent(id)}`);
      } catch {
        setError('브라우저에 저장하지 못했어요. 저장소 설정을 확인해 주세요.');
      }
    }
    return <div className="treatment-confirm">
      {error && <p role="alert">{error}</p>}
      <button className="button button-primary" type="button" onClick={save}>저장하고 진행 카드 보기</button>
    </div>;
  }

  function Scene({ active, done, pins }) {
    const ref = useRef(null);
    const count = pins.length;
    useEffect(() => {
      let cancelled = false;
      let dispose;
      import('./world/scene.js').then(({ mountScene }) => {
        if (!cancelled && ref.current) dispose = mountScene(ref.current, { count, done });
      }).catch(() => { /* The route state remains visible over the static landscape. */ });
      return () => {
        cancelled = true;
        dispose?.();
      };
    }, [count, done]);
    return <div className="treatment-world">
      <div className="treatment-world-canvas" ref={ref} aria-hidden="true"></div>
      <div className="treatment-world-copy">
        <span>SCRAP WORLD</span>
        <strong>{done ? '추적 완료' : active || '처리경로를 확인하세요'}</strong>
        <small>3D 모식도 · 공장 위치는 화면 배치</small>
      </div>
      {count > 0 && <ol className="treatment-map-key" aria-label="3D 화면에 표시한 업체">
        {pins.map((pin, i) => <li key={pin.facility_key}>
          <b>{i + 1}</b> {pin.label}
          {pin.straight_line_distance_km != null && <small> · 직선 {pin.straight_line_distance_km} km</small>}
        </li>)}
      </ol>}
    </div>;
  }

  function SourceLinks({ sources }) {
    return sources.map(({ publisher, url, locator }, index) =>
      <a className="treatment-source" href={url} key={`${url}-${index}`}
        target="_blank" rel="noreferrer">{publisher} · {locator}</a>);
  }

  function RegistryPlan({ entry, onPlan }) {
    const [error, setError] = useState('');
    return <details className="treatment-registry-review">
      <summary>확인한 업체를 예정 경로에 연결</summary>
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const reference = String(data.get('reference') || '').trim();
        if (!reference) {
          setError('확인한 자료 번호나 식별자를 입력해 주세요.');
          return;
        }
        const [latitude, longitude] = entry.coordinates || [];
        onPlan({
          capability_key: entry.listing_id,
          label: entry.name, address: entry.address,
          location: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
          straight_line_distance_km: entry.straight_line_distance_km,
          source: {
            kind: 'registry', sourceUrl: entry.source_url, asOf: entry.as_of,
            reviewReference: reference, reviewBasis: 'operator-confirmed',
          },
        });
      }}>
        <label>확인 자료 번호 또는 식별자 <input name="reference" maxLength={160} required /></label>
        <label><input type="checkbox" required /> 이 사업장의 공정과 현행 허가 범위를 확인했어요.</label>
        <label><input type="checkbox" required /> 이 로트의 인수 조건을 확인했어요.</label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="button button-quiet">예정 업체로 기록</button>
      </form>
    </details>;
  }

  function RegistrySearch({ value, transition, onPlan }) {
    const wasteCode = value.completed.length ? null : value.input.waste_code;
    const [region, setRegion] = useState(
      !value.completed.length && value.input.originType === 'demo'
        ? demoWorkplace.region.split(' ')[0] : '',
    );
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const controller = useRef(null);
    useEffect(() => () => controller.current?.abort(), []);

    async function search(event) {
      event.preventDefault();
      if (loading) return;
      const request = new AbortController();
      controller.current = request;
      setLoading(true);
      setResult(null);
      setError('');
      const point = routeOrigin(value);
      try {
        const response = await fetch('/api/treatment/facility-candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: request.signal,
          body: JSON.stringify({
            transition_key: transition,
            waste_code: wasteCode,
            region: region.trim() || null,
            origin_latitude: point?.latitude ?? null,
            origin_longitude: point?.longitude ?? null,
            page_size: 5,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.search_scope) throw new Error('시설 명부를 조회하지 못했어요.');
        if (!request.signal.aborted) setResult(data);
      } catch {
        if (!request.signal.aborted) setError('시설 명부를 조회하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    }

    return <section className="treatment-registry" aria-label="시설 명부 조사">
      <h5>시설 명부에서 추가 업체 조사</h5>
      <p>{wasteCode ? '분류번호가 일치하는 명부 단서예요.' : '현재 공정의 소재로 조회한 명부 단서예요.'}
        {' '}업체별 공정, 현행 허가와 인수 조건을 확인해야 해요.</p>
      <form onSubmit={search}>
        <label>검색 지역 <input value={region} maxLength={160} placeholder="비우면 전국 검색"
          disabled={loading} onChange={(event) => { setRegion(event.target.value); setResult(null); setError(''); }} /></label>
        <button className="button button-quiet" type="submit" disabled={loading}>
          {loading ? '명부 조회 중…' : '명부 검색'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (result.search_scope.registry_imported
        ? <div>
          <p role="status">명부 단서 {result.pagination.total_registry_candidates}건 · 표시 {result.registry_candidates.length}건</p>
          <ul>{result.registry_candidates.map(({ listing_id, research_packet: entry }) => entry && <li key={listing_id}>
            <strong>{entry.name}</strong>
            <p>{entry.address || '주소 미확인'} · {entry.business_type}</p>
            <small>{entry.straight_line_distance_km == null ? '거리 미확인'
              : `명부 좌표 직선 ${entry.straight_line_distance_km} km`} · 공정 근거 미확인</small>
            <RegistryPlan entry={{ ...entry, listing_id }} onPlan={onPlan} />
          </li>)}</ul>
          {result.registry_candidates.length > 0 && <a className="treatment-source"
            href="https://www.data.go.kr/data/15114147/standard.do" target="_blank" rel="noreferrer">전국폐기물처리업소 표준데이터</a>}
        </div>
        : <p role="status">시설 명부가 이 서버에 적재되면 검색할 수 있어요.</p>)}
    </section>;
  }

  function History({ value }) {
    return <section className="detail-panel treatment-history">
      <header><div><p>TRACKING LOG</p><h2>처리 기록</h2></div></header>
      <ol>
        <li><strong>분류번호 {value.input.waste_code} 기록</strong>
          {value.createdAt && <small>{stamp(value.createdAt)}</small>}
        </li>
        {value.completed.map((step) => <li key={step.transition_key}>
          <strong>{step.process} 완료 기록 · {step.facility}</strong>
          <small>{stamp(step.completedAt)} · 산출물 {step.output}</small>
        </li>)}
        {value.pending && <li>
          <strong>{value.pending.process} 결과 대기 · {value.pending.facility}</strong>
          <small>{stamp(value.pending.startedAt)}</small>
        </li>}
        {value.finished && <li><strong>처리경로 추적 종료</strong><small>{stamp(value.updatedAt)}</small></li>}
      </ol>
      <EvidenceReport value={value} />
    </section>;
  }

  function Summary({ waste }) {
    const value = getTreatmentCase(waste);
    if (!value) return null;
    return <section className="next-action-card">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>{value.finished ? '처리경로 추적을 마쳤어요' :
          value.pending ? '선택한 공정의 결과를 기다리고 있어요' : '다음 공정의 업체를 확인해 주세요'}</h2>
        {value.pending && <p>{value.pending.facility} · {value.pending.process}</p>}
      </div>
      <a className="button button-primary" href={`/wastes/${waste.id}?tab=route`}>처리경로 보기</a>
    </section>;
  }

  function Panel({ waste }) {
    const [value, setValue] = useState(() => getTreatmentCase(waste));
    const [lookup, setLookup] = useState(null);
    const [fetchError, setFetchError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
      if (!value || value.pending || value.finished) return;
      const controller = new AbortController();
      requestNext(value, controller.signal).then(setLookup).catch((error) => {
        if (!controller.signal.aborted) setFetchError(error.message);
      });
      return () => controller.abort();
    }, [value, attempt]);

    function update(change) {
      try {
        const stored = getTreatmentCase(waste);
        if (!stored || JSON.stringify(stored) !== JSON.stringify(value)) {
          throw new Error('다른 탭에서 상태가 바뀌었어요. 이 페이지를 다시 열어 주세요.');
        }
        const next = storeCase(change(value));
        setLookup(null);
        setFetchError('');
        setSaveError('');
        setValue(next);
      } catch (error) {
        setSaveError(error.message);
      }
    }

    const pending = value?.pending;
    const finished = value?.finished;
    const current = pending?.process || lookup?.current_state?.label || null;
    const facilities = lookup?.options.flatMap((option) => option.facilities) || [];
    const facilityCount = new Set(facilities.map((facility) => facility.facility_key)).size;
    const ranked = facilities
      .filter((facility) => facility.distance_rank)
      .sort((a, b) => a.distance_rank - b.distance_rank);
    const pins = pending ? [{ facility_key: pending.capability_key, label: pending.facility,
      straight_line_distance_km: pending.distance }] :
      [...new Map(ranked.map((facility) => [facility.facility_key, facility])).values()];
    const trackingLabel = finished ? '추적 종료' : pending ? '결과 대기' : '다음 공정 확인';
    return <section className="detail-panel treatment-panel" id="treatment-route">
      <header>
        <div><p>CIRCULAR ROUTE</p><h2>처리경로</h2></div>
        <span>{value ? trackingLabel : waste.status}</span>
      </header>
      <Scene active={current} done={Boolean(finished)} pins={pins} />
      <div className="treatment-body">
        {!value && <div className="treatment-status">
            <h3>{waste.status === '분석 대기' ? '분석 결과 확인이 필요해요' : '연결된 처리경로가 없어요'}</h3>
            <p>문진에서 분류번호와 재질·형태를 기록한 건부터 다음 공정을 조회할 수 있어요.</p>
            <a className="button button-primary" href="/wastes">내 폐기물로 돌아가기</a>
          </div>}
        {value && <div className="treatment-flow" aria-label="처리 진행 상태">
          <span className="is-done">✓ 분류 기록</span>
          {value.completed.map((step) => <span key={step.transition_key} className="is-done">✓ {step.process}</span>)}
          <span className="is-current">{pending ? pending.process : trackingLabel}</span>
        </div>}
        {saveError && !pending && <p role="alert">{saveError}</p>}
        {pending && <div className="treatment-status">
          <span>● 결과 대기 · {stamp(pending.startedAt)}</span>
          <h3>{pending.facility}</h3><p>{pending.process} → {pending.output}</p>
          <EvidenceTrail value={value} error={saveError}
            onRecord={(stage, data) => update((previous) => recordEvidence(previous, stage, data))}
            onComplete={() => update(completeStep)} />
        </div>}
        {finished && <div className="treatment-status">
          <h3>처리경로 추적을 마쳤어요</h3>
          <p>완료한 공정 {value.completed.length}개와 선택 업체는 기록 탭에서 볼 수 있어요.</p>
        </div>}
        {value && !pending && !finished && <div className="treatment-options" aria-live="polite">
          {fetchError ? <div className="treatment-status" role="alert">
            <p>{fetchError}</p>
            <button className="button button-quiet" type="button" onClick={() => {
              setFetchError('');
              setAttempt(attempt + 1);
            }}>다시 조회</button>
          </div> : !lookup ? <p className="treatment-status">다음 공정을 찾고 있어요…</p> : <div>
            <div className="treatment-option-head">
              <div><small>{lookup.backend === 'reference_demo' ? 'KG 참조 데이터 · 데모' : 'Neo4j · 공정 근거'}</small>
                <h3>지금 이어갈 수 있는 공정</h3><p>{lookup.message}</p>
                {lookup.options.length > 0 && <p>{value.completed.length
                  ? `거리 기준 출발지 · ${value.completed.at(-1).facility}`
                  : value.input.origin ? `배출사업장 A · ${value.input.originLabel || '등록된 배출 공장'}` : '등록된 배출 공장 위치 없음'}
                  {' · '}{pins.length > 1 ? `직선거리 순 ${pins.length}곳`
                    : pins.length ? '직선거리 표시 1곳' : '거리 확인 가능한 업체 없음'}</p>}
                {lookup.options.length > 0 && <small>
                  공정 KG에 등록된 시설 후보 {facilityCount}곳 · 검색 범위는 공개 공정 사례
                </small>}
                {!value.completed.length && value.input.originSource && <SourceLinks sources={[{
                  publisher: '출발지 좌표', url: value.input.originSource, locator: '데모 지역 기준점',
                }]} />}
              </div>
              {lookup.can_finish && <button className="button button-quiet" type="button"
                onClick={() => update(finishCase)}>이 산출물로 추적 마치기</button>}
            </div>
            {lookup.options.map((process) => <article className="treatment-process" key={process.transition_key}>
              <h4>{process.label}</h4>
              <p>{process.input_state.label} → {process.output_state.label}</p>
              <ol className="treatment-operations" aria-label="세부 작업">
                {process.operation_steps.map((operation) => <li key={operation}>{operation}</li>)}
              </ol>
              <details><summary>공정 조건과 근거</summary>
                <ul>{process.checks.map((check) => <li key={check}>{check}</li>)}</ul>
                <SourceLinks sources={process.sources} />
              </details>
              {process.facilities.length === 0 && <p>이 공정에 연결된 시설 근거가 없어요.</p>}
              {process.facilities.map((facility) => <div className="treatment-facility" key={facility.capability_key}>
                <div><strong>{facility.label}</strong>
                  <p>{facility.region} · {facility.evidence_basis === 'published_site_process' ?
                    '공개 공정 사례' : '사업장 역할 기반 조사 후보'}</p>
                  <p>{facilityCount > 1 && facility.distance_rank ? `거리 ${facility.distance_rank}위 · ` : ''}
                    {facility.straight_line_distance_km == null ? '거리 미확인' : `직선 ${facility.straight_line_distance_km} km`}</p>
                  <SourceLinks sources={facility.sources.slice(0, 1)} />
                  <details><summary>시설 근거와 확인할 조건</summary>
                    <ul>{facility.checks.map((check, i) => <li key={i}>{check}</li>)}</ul>
                    <SourceLinks sources={facility.sources.slice(1)} />
                    {facility.location_source_url && <SourceLinks sources={[{
                      publisher: '공개 위치', url: facility.location_source_url, locator: '거리 산정 좌표',
                    }]} />}
                  </details>
                </div>
                <button className="button button-primary" type="button"
                  onClick={() => update((previous) => beginStep(previous, process, facility))}>
                  이 업체로 추적 시작
                </button>
              </div>)}
              <RegistrySearch value={value} transition={process.transition_key}
                onPlan={(facility) => update((previous) => beginStep(previous, process, facility))} />
            </article>)}
            {lookup.options.length > 0 && <small className="treatment-note">허가, 인수 여부와 수용량은 업체 확인이 필요합니다. 이 화면은 연락이나 배차를 실행하지 않습니다.</small>}
          </div>}
        </div>}
      </div>
    </section>;
  }

  function SavedTab({ waste, tab }) {
    const value = getTreatmentCase(waste);
    if (!value) return null;
    if (tab === 'history') return <History value={value} />;
    return <section className="detail-panel treatment-history">
      <header><div><p>CLASSIFICATION</p><h2>기록한 분류</h2></div></header>
      <ul><li><strong>{value.input.waste_code} · {materialLabels[value.input.material]}</strong>
        <small>{forms[value.input.material]?.find(([key]) => key === value.input.input_form)?.[1]}</small></li></ul>
    </section>;
  }

  return { Confirm, Panel, SavedTab, Summary, SurveyMaterial };
}
