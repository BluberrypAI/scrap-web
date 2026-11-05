/** @jsx h */
import { beginStep, completeStep, finishCase, loadCase, newCase, storeCase } from './treatment-state.js';
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
const demoOrigin = { latitude: 36.64, longitude: 127.45 };
const classifiedExamples = new Set(['synthetic-resin', 'aluminium-can-sample']);

function stamp(value) {
  return new Date(value).toLocaleString('ko-KR');
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
      origin: value.completed.length ? value.completed.at(-1).location : value.input.origin,
      completed_transitions: value.completed.map((step) => step.transition_key),
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status) {
    throw new Error(result?.detail?.message || '공정 엔진에 연결하지 못했어요. 실행 상태를 확인해 주세요.');
  }
  return result;
}

// Use the React runtime already included in the team's exported HTML.
export function createTreatmentUI(React) {
  const { createElement: h, useEffect, useRef, useState } = React;

  function Confirm({ id, wasteCode = '51-03-01', demoSurvey = false }) {
    const [material, setMaterial] = useState('');
    const [form, setForm] = useState('');
    const [error, setError] = useState('');
    const [originType, setOriginType] = useState('demo');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const materials = wasteCode === '51-29-03' ? ['aluminium'] : ['PP', 'PE', 'PET'];

    function submit(event) {
      event.preventDefault();
      if (!material || !form) return;
      const origin = originType === 'demo' ? demoOrigin : originType === 'manual' ? {
        latitude: Number(latitude), longitude: Number(longitude),
      } : null;
      try {
        storeCase(newCase(id, `폐${materialLabels[material]} · ${forms[material].find(([key]) => key === form)[1]}`,
          { waste_code: wasteCode, material, input_form: form, origin, originType }));
        window.__go(`/wastes/${id}?tab=route`);
      } catch {
        setError('브라우저에 저장하지 못했어요. 저장소 설정을 확인해 주세요.');
      }
    }

    return <form className="treatment-confirm" onSubmit={submit}>
      <p><b>{wasteCode}</b> · 이 번호로 재질과 현재 형태를 함께 기록해요.</p>
      {demoSurvey && <small>기존 문진은 합성수지 예시입니다. 등록된 문진 결과와 공정 탐색을 연결하는 데모예요.</small>}
      <div className="treatment-fields">
        <label>재질<select required value={material} onChange={(e) => {
          setMaterial(e.target.value);
          setForm('');
        }}>
          <option value="">선택</option>
          {materials.map((key) => <option key={key} value={key}>{materialLabels[key]}</option>)}
        </select></label>
        <label>현재 형태<select required value={form} disabled={!material} onChange={(e) => setForm(e.target.value)}>
          <option value="">선택</option>
          {(forms[material] || []).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      </div>
      <div className="treatment-fields">
        <label>배출 공장 위치<select value={originType} onChange={(e) => setOriginType(e.target.value)}>
          <option value="demo">가상 출발지 · 청주 인근</option>
          <option value="manual">좌표 직접 입력</option>
          <option value="none">위치 미입력</option>
        </select></label>
        {originType === 'manual' && <label>위도<input required type="number" step="any" min="-90" max="90"
          value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label>}
        {originType === 'manual' && <label>경도<input required type="number" step="any" min="-180" max="180"
          value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label>}
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={!material || !form}>
        저장하고 처리경로 열기
      </button>
    </form>;
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

  function History({ value }) {
    return <section className="detail-panel treatment-history">
      <header><div><p>TRACKING LOG</p><h2>처리 기록</h2></div></header>
      <ol>
        <li><strong>분류번호 {value.input.waste_code} 기록</strong><small>{stamp(value.createdAt)}</small></li>
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
    </section>;
  }

  function Summary({ id }) {
    const value = loadCase(id);
    if (!value) return null;
    return <section className="next-action-card">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>{value.finished ? '처리경로 추적을 마쳤어요' :
          value.pending ? '선택한 공정의 결과를 기다리고 있어요' : '다음 공정의 업체를 확인해 주세요'}</h2>
        <p>{value.pending ? `${value.pending.facility} · ${value.pending.process}` : `분류번호 ${value.input.waste_code}`}</p>
      </div>
      <a className="button button-primary" href={`/wastes/${id}?tab=route`}>처리경로 보기</a>
    </section>;
  }

  function Panel({ waste }) {
    const [value, setValue] = useState(() => loadCase(waste.id));
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
        const stored = loadCase(value.id);
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
    const ranked = lookup?.options.flatMap((option) => option.facilities)
      .filter((facility) => facility.distance_rank)
      .sort((a, b) => a.distance_rank - b.distance_rank) || [];
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
        {!value && (classifiedExamples.has(waste.id)
          ? <Confirm id={waste.id} wasteCode={waste.code} />
          : <div className="treatment-status">
            <h3>{waste.status === '분석 대기' ? '분석 결과 확인이 필요해요' : '연결된 처리경로가 없어요'}</h3>
            <p>문진에서 분류번호와 재질·형태를 기록한 건부터 다음 공정을 조회할 수 있어요.</p>
            <a className="button button-primary" href="/wastes">내 폐기물로 돌아가기</a>
          </div>)}
        {value && <div className="treatment-flow" aria-label="처리 진행 상태">
          <span className="is-done">✓ 분류 기록</span>
          {value.completed.map((step) => <span key={step.transition_key} className="is-done">✓ {step.process}</span>)}
          <span className="is-current">{pending ? pending.process : trackingLabel}</span>
        </div>}
        {saveError && <p role="alert">{saveError}</p>}
        {pending && <div className="treatment-status">
          <span>● 결과 대기 · {stamp(pending.startedAt)}</span>
          <h3>{pending.facility}</h3><p>{pending.process} → {pending.output}</p>
          <small>배출 기업이 직접 기록하는 상태입니다. 업체의 완료와 산출물 상태를 확인한 뒤 기록해 주세요.</small>
          <button className="button button-primary" type="button"
            onClick={() => update(completeStep)}>완료 확인 기록</button>
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
                  : value.input.originType === 'demo' ? '거리 기준 출발지 · 가상 청주 공장' : '거리 기준 출발지 · 배출 공장'}
                  {' · '}{ranked.length ? `직선거리 순 최대 5곳` : '거리 확인 가능한 업체 없음'}</p>}
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
                  <p>{facility.distance_rank ? `거리 ${facility.distance_rank}위 · ` : ''}
                    {facility.straight_line_distance_km == null ? '거리 미확인' : `직선 ${facility.straight_line_distance_km} km`}</p>
                  <details><summary>시설 근거와 확인할 조건</summary>
                    <ul>{facility.checks.map((check, i) => <li key={i}>{check}</li>)}</ul>
                    <SourceLinks sources={facility.sources} />
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
            </article>)}
            {lookup.options.length > 0 && <small className="treatment-note">허가, 인수 여부와 수용량은 업체 확인이 필요합니다. 이 화면은 연락이나 배차를 실행하지 않습니다.</small>}
          </div>}
        </div>}
      </div>
    </section>;
  }

  function SavedTab({ id, tab }) {
    const value = loadCase(id);
    if (!value) return null;
    if (tab === 'history') return <History value={value} />;
    return <section className="detail-panel treatment-history">
      <header><div><p>CLASSIFICATION</p><h2>기록한 분류</h2></div></header>
      <ul><li><strong>{value.input.waste_code} · {materialLabels[value.input.material]}</strong>
        <small>{forms[value.input.material]?.find(([key]) => key === value.input.input_form)?.[1]}</small></li></ul>
    </section>;
  }

  return { Confirm, Panel, SavedTab, Summary };
}
