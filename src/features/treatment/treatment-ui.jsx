/** @jsxRuntime classic */
/** @jsx h */
import { beginStep, demoWorkplace, finishCase, getTreatmentCase, handoffLabel, loadCase, newCase, readyForTreatment, recordTreatmentResult, reviewTreatmentOutput, sameFacility, storeCase, watchCase } from './treatment-state.js';
import { saveSharedCase, useServerTransport, useSharedCase } from './transport-client.js';
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
      observed_output: value.completed.at(-1)?.observedOutput ?? null,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status) {
    throw new Error(result?.message || result?.detail?.message || '공정 엔진에 연결하지 못했어요. 실행 상태를 확인해 주세요.');
  }
  return result;
}

// Use the React runtime already included in the team's exported HTML.
export function createTreatmentUI(React) {
  const { createElement: h, useEffect, useRef, useState } = React;
  const { EvidenceReport } = createEvidenceUI(React);

  function useStoredCase(id) {
    const [value, setValue] = useState(() => loadCase(id));
    useEffect(() => {
      const refresh = () => setValue(loadCase(id));
      refresh();
      return watchCase(id, refresh);
    }, [id]);
    return value;
  }

  function LotProgress({ id, fallback }) {
    const value = useStoredCase(id);
    useServerTransport(id, value?.pending);
    const step = value?.pending ?? value?.completed.at(-1);
    if (!step) return <p>{fallback}</p>;
    const received = step.handoff?.status === 'accepted';
    const percent = value.finished ? 100 : !value.pending || readyForTreatment(step) ? 66 : 33;
    return <div className="handoff-card-progress" data-status={step.handoff?.status}>
      <span>{value.finished ? '✓ 추적 완료' : !value.pending ? '✓ 공정 완료 · 다음 구간 확인' :
        received ? '✓ 업체 수령 확인' : handoffLabel(step)}</span>
      <progress max="100" value={percent} aria-label="현재 공정 진행 상태" />
    </div>;
  }

  function TreatmentResult({ step, onRecord }) {
    const states = step.outputStates?.length ? step.outputStates : [step.expectedState].filter(Boolean);
    return <form className="treatment-confirm treatment-result" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const purity = data.get('purity');
      onRecord({
        stateKey: data.get('state') === 'unknown' ? null : data.get('state'), massKg: Number(data.get('mass')),
        purityPercent: purity === '' ? null : Number(purity),
      });
    }}>
      <h4>실제 처리 결과</h4>
      <label>산출물 상태<select name="state" defaultValue="unselected" required>
        <option value="unselected" disabled>실제 상태를 확인해 선택</option>
        {states.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        <option value="unknown">기타 · 등록된 상태와 다름</option>
      </select></label>
      <label>산출물 중량 (kg)<input name="mass" type="number" min="0" max="1000000000" step="any" required /></label>
      <label>측정 순도 (%) · 선택<input name="purity" type="number" min="0" max="100" step="any" /></label>
      <button className="button button-primary" type="submit">결과 저장하고 다음 후보 찾기</button>
    </form>;
  }

  function SurveyMaterial({ treatment, onAnswer }) {
    const [material, setMaterial] = useState(treatment?.material ?? '');
    const [form, setForm] = useState('');
    return <form className="treatment-confirm" onSubmit={(event) => {
      event.preventDefault();
      onAnswer({ material, input_form: form, ...(treatment && { waste_code: treatment.waste_code }) });
    }}>
      <h2>{treatment ? '폐기물의 현재 형태를 선택해 주세요' : '어떤 수지이고 어떤 형태인가요?'}</h2>
      <p>{treatment ? `${treatment.waste_code} · ${materialLabels[material]}` : '재질과 형태에 따라 이어지는 공정이 달라요.'}</p>
      <div className="treatment-fields">
        {!treatment && <label>재질<select required value={material} onChange={(e) => {
          setMaterial(e.target.value);
          setForm('');
        }}>
          <option value="">선택</option>
          {['PP', 'PE', 'PET'].map((key) => <option key={key} value={key}>{materialLabels[key]}</option>)}
        </select></label>}
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
        const saved = loadCase(id);
        if (saved?.pending || saved?.completed.length || saved?.finished) {
          setError('처리 중인 건의 분류를 바꾸려면 별도 폐기물 카드에서 시작해 주세요.');
          return;
        }
        if (!saved || input.waste_code) {
          const { material, input_form } = input;
          const formLabel = forms[material].find(([key]) => key === input_form)[1];
          storeCase(newCase(id, `폐${materialLabels[material]} · ${formLabel}`, {
            ...input, ...demoWorkplace.routeOrigin,
          }));
        }
        navigate(`/wastes/${id}?tab=route`);
      } catch {
        setError('브라우저에 저장하지 못했어요. 저장소 설정을 확인해 주세요.');
      }
    }
    return <div className="treatment-confirm">
      <p>{materialLabels[input.material]} · {forms[input.material].find(([key]) => key === input.input_form)[1]}</p>
      {error && <p role="alert">{error}</p>}
      <button className="button button-primary" type="button" onClick={save}>저장하고 처리경로 열기</button>
    </div>;
  }

  function Scene({ active, done, pins, routeLength, originLabel }) {
    const ref = useRef(null);
    const count = pins.length;
    useEffect(() => {
      let cancelled = false;
      let dispose;
      import('./world/scene.js').then(({ mountScene }) => {
        if (!cancelled && ref.current) dispose = mountScene(ref.current, { count, done, routeLength });
      }).catch(() => { /* The route state remains visible over the static landscape. */ });
      return () => {
        cancelled = true;
        dispose?.();
      };
    }, [count, done, routeLength]);
    return <div className="treatment-world">
      <div className="treatment-world-canvas" ref={ref} aria-hidden="true"></div>
      <div className="treatment-world-copy">
        <span>SCRAP WORLD</span>
        <strong>{done ? '추적 완료' : active || '처리경로를 확인하세요'}</strong>
        <small>3D 모식도 · 출발 {originLabel}</small>
      </div>
      {count > 0 && <ol className="treatment-map-key" aria-label="3D 화면에 표시한 업체">
        {pins.map((pin, i) => <li key={pin.facility_key}>
          <b>{i + 1}</b> {pin.label}
          {pin.receipt === 'accepted' && <small className="handoff-map-receipt accepted"> · ✓ 수령 확인</small>}
          {pin.receipt === 'rejected' && <small className="handoff-map-receipt rejected"> · 수령 문제</small>}
          {pin.completed && <small className="handoff-map-receipt accepted"> · ✓ 공정 완료</small>}
          {pin.internal && <small> · 내부 공정 진행</small>}
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

  function FacilityReviewForm({ onConfirm }) {
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
        if (data.get('site') !== 'on' || data.get('intake') !== 'on') {
          setError('사업장과 인수 조건을 확인해 주세요.');
          return;
        }
        onConfirm(reference);
      }}>
        <label>확인 자료 번호 또는 식별자 <input name="reference" maxLength={160} required /></label>
        <label><input name="site" type="checkbox" required /> 이 사업장의 공정과 현행 허가 범위를 확인했어요.</label>
        <label><input name="intake" type="checkbox" required /> 이 로트의 인수 조건을 확인했어요.</label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="button button-quiet">예정 업체로 기록</button>
      </form>
    </details>;
  }

  function RegistryPlan({ entry, onPlan }) {
    const [latitude, longitude] = entry.coordinates || [];
    return <FacilityReviewForm onConfirm={(reference) => onPlan({
      capability_key: entry.listing_id, label: entry.name, address: entry.address,
      location: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
      straight_line_distance_km: entry.straight_line_distance_km,
      source: {
        kind: 'registry', sourceUrl: entry.source_url, asOf: entry.as_of,
        reviewReference: reference, reviewBasis: 'operator-confirmed',
      },
    })} />;
  }

  function IntakeAgent({ input, capabilityKey }) {
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    async function review() {
      setBusy(true);
      setResult(null);
      try {
        const { waste_code, material, input_form } = input;
        const response = await fetch('/api/treatment/intake-review', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waste_code, material, input_form, capability_key: capabilityKey }),
        });
        if (!response.ok) throw new Error('review failed');
        setResult(await response.json());
      } catch {
        setResult({ status: 'request_failed' });
      } finally {
        setBusy(false);
      }
    }
    const labels = {
      needs_evidence: '대조할 수 있는 사업장 반입 근거가 부족해요.',
      model_unavailable: 'AI 검토 모델 연결을 확인해 주세요.',
      request_failed: 'AI 검토를 불러오지 못했어요.',
    };
    return <div className="treatment-intake-agent">
      <button type="button" className="button button-quiet" disabled={busy} onClick={review}>
        {busy ? '반입 근거 검토 중…' : 'AI로 반입 근거 검토'}
      </button>
      {result && <div role="status">
        {result.status === 'reviewed' ? <>
          <p>{result.finding === 'restriction_mentioned' ? '반입 제한 관련 단서' : '반입 형태 관련 단서'}</p>
          <p>등록 자료 발췌 · {result.quote}</p>
          {result.source && <SourceLinks sources={[result.source]} />}
        </> : <p>{labels[result.status]}</p>}
        {result.next_check && <p>{result.next_check}</p>}
      </div>}
    </div>;
  }

  function FacilityCard({ facility, firstHandoff, input, lastStep, facilityCount, onPlan }) {
    const direct = facility.evidence_basis === 'published_site_process';
    const review = firstHandoff ? facility.intake_review : null;
    const evidenceText = {
      site_example: '같은 반입 형태의 공개 사례 있음',
      form_not_documented: '이 형태의 반입 근거 확인 필요',
      site_process_unconfirmed: '해당 사업장의 공정 확인 필요',
    };
    return <div className="treatment-facility">
      <div><strong>{facility.label}</strong>
        <p>{facility.address || facility.region} · {direct
          ? '공개 공정 근거 · 인수 미확인' : '공정 범위 확인이 필요한 조사 후보'}</p>
        <p>{facilityCount > 1 && facility.distance_rank ? `거리 ${facility.distance_rank}위 · ` : ''}
          {facility.straight_line_distance_km == null ? '거리 미확인' : `직선 ${facility.straight_line_distance_km} km`}</p>
        {review && <p className="treatment-intake-check"><strong>{evidenceText[review.form_evidence]}</strong>
          {' · '}{review.next_check}</p>}
        <SourceLinks sources={(review?.sources ?? facility.sources).slice(0, 1)} />
        <details><summary>시설 근거와 확인할 조건</summary>
          <ul>{facility.checks.map((check, i) => <li key={i}>{check}</li>)}</ul>
          <SourceLinks sources={facility.sources} />
          {facility.location_source_url && <SourceLinks sources={[{
            publisher: '공개 위치', url: facility.location_source_url, locator: '거리 산정 좌표',
          }]} />}
        </details>
        {review && <IntakeAgent input={input} capabilityKey={facility.capability_key} />}
      </div>
      {firstHandoff && !direct ? <FacilityReviewForm onConfirm={(reference) => onPlan({
        ...facility, source: { kind: 'kg', references: facility.sources,
          reviewReference: reference, reviewBasis: 'operator-confirmed' },
      })} /> : <button className="button button-primary" type="button" onClick={() => onPlan(facility)}>
        {sameFacility(lastStep, facility) ? '사업장 내부 공정 이어가기' : '다음 인계 업체로 선택'}
      </button>}
    </div>;
  }

  function RegistrySearch({ value, wasteCode: classifiedCode, transition, onPlan }) {
    const wasteCode = classifiedCode ?? (value?.completed.length ? null : value?.input.waste_code);
    const [region, setRegion] = useState('');
    const [query, setQuery] = useState(() => wasteCode ? { region: '', cursor: null } : null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const point = value ? routeOrigin(value) : null;
    useEffect(() => {
      if (!query) return;
      const request = new AbortController();
      setLoading(true);
      setError('');
      if (!query.cursor) setResult(null);
      async function search() {
        try {
          const response = await fetch('/api/treatment/facility-candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: request.signal,
            body: JSON.stringify({
              transition_key: transition ?? null,
              waste_code: wasteCode,
              region: query.region || null,
              origin_latitude: point?.latitude ?? null,
              origin_longitude: point?.longitude ?? null,
              page_size: 5,
              cursor: query.cursor,
            }),
          });
          const data = await response.json();
          if (!response.ok || !data.search_scope) throw new Error('시설 명부를 조회하지 못했어요.');
          if (!request.signal.aborted) setResult((previous) => ({
            ...data, registry_candidates: query.cursor && previous
              ? [...previous.registry_candidates, ...data.registry_candidates] : data.registry_candidates,
          }));
        } catch {
          if (!request.signal.aborted) setError('시설 명부를 조회하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
        } finally {
          if (!request.signal.aborted) setLoading(false);
        }
      }
      search();
      return () => request.abort();
    }, [query, transition, wasteCode, point?.latitude, point?.longitude]);

    return <section className="treatment-registry" aria-label="시설 명부 조사">
      <h5>공공 명부에서 찾은 추가 조사 후보</h5>
      <p>{wasteCode ? '분류번호가 일치하는 명부 단서예요.' : '현재 공정의 소재로 조회한 명부 단서예요.'}
        {' '}업체별 공정, 현행 허가와 인수 조건을 확인해야 해요.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        setQuery({ region: region.trim(), cursor: null });
      }}>
        <label>검색 지역 <input value={region} maxLength={160} placeholder="비우면 전국 검색"
          disabled={loading} onChange={(event) => setRegion(event.target.value)} /></label>
        <button className="button button-quiet" type="submit" disabled={loading}>
          {loading ? '명부 조회 중…' : '명부 검색'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result?.web_research_leads?.length > 0 && <details className="treatment-registry-review">
        <summary>웹에서 찾은 공정 자료 · 검토 대기 {result.web_research_leads.length}건</summary>
        <p>같은 소재군의 공개 자료예요. 이 공정과 실제 반입 조건을 따로 확인해야 해요.</p>
        <ul>{result.web_research_leads.map((lead) => <li key={`${lead.site}:${lead.url}`}>
          <strong>{lead.site}</strong>
          <p>{lead.address || '사업장 주소 확인 필요'} · {lead.process}</p>
          <a className="treatment-source" href={lead.url} target="_blank" rel="noreferrer">공개 근거 열기</a>
        </li>)}</ul>
      </details>}
      {result && (result.search_scope.registry_imported
        ? <div>
          <p role="status">명부 단서 {result.pagination.total_registry_candidates}건 · 표시 {result.registry_candidates.length}건
            {transition ? ' · 설비 단서와 거리 참고' : ''}</p>
          {result.pagination.total_registry_candidates === 0 && <p>조회 조건과 일치하는 명부 항목이 없어요.</p>}
          <ul>{result.registry_candidates.map(({ listing_id, research_packet: entry }) => entry && <li key={listing_id}>
            <strong>{entry.name}</strong>
            <p>{entry.address || '주소 미확인'} · {entry.business_type}</p>
            <small>{entry.straight_line_distance_km == null ? '거리 미확인'
              : `명부 좌표 직선 ${entry.straight_line_distance_km} km`} · 공정 근거 미확인</small>
            {entry.equipment_mentions?.length > 0 && <p>명부 설비 표기 · {entry.equipment_mentions.join(' · ')}</p>}
            {onPlan && <RegistryPlan entry={{ ...entry, listing_id }} onPlan={onPlan} />}
          </li>)}</ul>
          {result.pagination.has_more && <button className="button button-quiet" type="button" disabled={loading}
            onClick={() => setQuery({ region: query.region, cursor: result.pagination.next_cursor })}>
            조사 후보 5곳 더 보기
          </button>}
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
        {value.completed.map((step, index) => <li key={step.legId ?? index}>
          <strong>{step.process} 완료 기록 · {step.facility}</strong>
          <small>{stamp(step.completedAt)} · 산출물 {step.observedLabel ?? step.output}
            {step.observedOutput && ` · ${step.observedOutput.mass_kg} kg`}</small>
        </li>)}
        {value.pending && <li>
          <strong>{value.pending.process} · {handoffLabel(value.pending)} · {value.pending.facility}</strong>
          <small>{stamp(value.pending.startedAt)}</small>
        </li>}
        {value.finished && <li><strong>처리경로 추적 종료</strong><small>{stamp(value.updatedAt)}</small></li>}
      </ol>
      <EvidenceReport value={value} />
    </section>;
  }

  function Summary({ waste, processorView }) {
    const value = useStoredCase(waste.id) ?? getTreatmentCase(waste);
    if (!value) return null;
    return <section className="next-action-card">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>{value.finished ? '처리경로 추적을 마쳤어요' :
          value.pending ? handoffLabel(value.pending) : '다음 공정의 업체를 확인해 주세요'}</h2>
        <p>{value.pending ? `${value.pending.facility} · ${value.pending.process}` : `분류번호 ${value.input.waste_code}`}</p>
      </div>
      <a className="button button-primary" href={`/wastes/${waste.id}?tab=route${processorView ? '&view=processor' : ''}`}>처리경로 보기</a>
    </section>;
  }

  function Panel({ waste, processorView: demoProcessorView = false }) {
    const [value, setValue] = useState(() => getTreatmentCase(waste));
    useServerTransport(waste.id, value?.pending);
    useSharedCase(value?.sharedCaseId);
    const processorView = value?.sharedCaseId ? value.sharedCanProcess : demoProcessorView;
    const [lookup, setLookup] = useState(null);
    const [fetchError, setFetchError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const canChoose = Boolean(value && (processorView ? value.completed.length : !value.completed.length));
    const needsPendingLookup = Boolean(value?.pending && (
      (!value.completed.length && !value.initialPreviews?.length) ||
      (processorView && readyForTreatment(value.pending) && !value.pending.outputStates?.length)
    ));
    useEffect(() => {
      function sync() {
        setValue(getTreatmentCase(waste));
        setLookup(null);
        setFetchError('');
        setSaveError('');
      }
      return watchCase(waste.id, sync);
    }, [waste.id]);
    useEffect(() => {
      if (!needsPendingLookup && (!canChoose || value.pending || value.finished)) return;
      const controller = new AbortController();
      requestNext(value, controller.signal).then((result) => {
        if (!controller.signal.aborted) setLookup(result);
      }).catch((error) => {
        if (!controller.signal.aborted) setFetchError(error.message);
      });
      return () => controller.abort();
    }, [value, canChoose, needsPendingLookup, attempt]);

    async function update(change) {
      try {
        const stored = getTreatmentCase(waste);
        if (!stored || JSON.stringify(stored) !== JSON.stringify(value)) {
          throw new Error('다른 탭에서 상태가 바뀌었어요. 이 페이지를 다시 열어 주세요.');
        }
        const updated = change(value);
        const next = value.sharedCaseId ? await saveSharedCase(value, updated) : storeCase(updated);
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
    const completed = value?.completed ?? [];
    const lastStep = completed.at(-1);
    const firstHandoff = !lastStep;
    const preview = value?.initialPreviews?.length ? value.initialPreviews : !completed.length
      ? lookup?.process_previews?.filter((path) => !pending || path[0]?.transition_key === pending.transition_key)
      : null;
    const reportableStep = pending && !pending.outputStates?.length && lookup?.output_states?.length
      ? { ...pending, outputStates: lookup.output_states } : pending;
    const viewLink = `/wastes/${waste.id}?tab=route${processorView ? '' : '&view=processor'}`;
    const current = pending?.process || lookup?.current_state?.label || null;
    const facilities = lookup?.options.flatMap((option) => option.facilities) || [];
    const facilityCount = new Set(facilities.map((facility) => facility.facility_key)).size;
    const ranked = facilities
      .filter((facility) => facility.distance_rank && !sameFacility(lastStep, facility) &&
        (!firstHandoff || facility.evidence_basis === 'published_site_process'))
      .sort((a, b) => a.distance_rank - b.distance_rank);
    const candidatePins = [...new Map(ranked.map((facility) => [facility.facility_key, facility])).values()];
    const trackedSteps = pending ? [...completed, pending] : completed;
    const mapVisits = trackedSteps.reduce((visits, step) => {
      if (step.internal && sameFacility(visits.at(-1), step)) {
        visits[visits.length - 1] = { ...step, handoff: visits.at(-1).handoff };
      } else {
        visits.push(step);
      }
      return visits;
    }, []);
    const mapSteps = mapVisits.slice(-5);
    const showCandidates = canChoose && !pending && !finished && candidatePins.length > 0;
    const pins = showCandidates ? candidatePins : mapSteps.map((step, index) => ({
      facility_key: step.legId ?? index, label: step.facility,
      receipt: step.completedAt ? undefined : step.handoff?.status,
      completed: Boolean(step.completedAt),
      internal: step.internal && !step.completedAt,
    }));
    const mapOrigin = showCandidates ? lastStep?.facility
      : mapVisits.length > mapSteps.length ? mapVisits.at(-6)?.facility : null;
    const trackingLabel = finished ? '추적 종료' : pending ? handoffLabel(pending) : '다음 공정 확인';
    return <section className="detail-panel treatment-panel" id="treatment-route">
      <header>
        <div><p>CIRCULAR ROUTE</p><h2>처리경로</h2></div>
        <span>{value ? trackingLabel : waste.status}</span>
      </header>
      <Scene active={current} done={Boolean(finished)} pins={pins}
        routeLength={showCandidates ? 0 : pins.length}
        originLabel={mapOrigin || value?.input.originLabel || '배출사업장'} />
      <div className="treatment-body">
        {value && (pending || lastStep || processorView) && <p className="treatment-view">
          {processorView ? '처리업체 관점 · 로컬 시연' : '배출기업 관점'}
          {!value.sharedCaseId && <> · <a href={viewLink}>{processorView ? '배출기업 화면' : '처리업체 화면 시연'}</a></>}
        </p>}
        {!value && <div className="treatment-status">
            <h3>{waste.status === '분석 대기' ? '분석 결과 확인이 필요해요' : '연결된 처리경로가 없어요'}</h3>
            <p>문진에서 분류번호와 재질·형태를 기록한 건부터 다음 공정을 조회할 수 있어요.</p>
            <a className="button button-primary" href="/wastes">내 폐기물로 돌아가기</a>
          </div>}
        {preview?.length > 0 && <section className="treatment-status treatment-preview">
          <h3>처음 예상한 공정 흐름</h3>
          <ul>{preview.map((path) => {
            const label = path.map((step) => step.label).join(' → ');
            return <li key={path.map((step) => step.transition_key).join('/')}>{label}</li>;
          })}</ul>
        </section>}
        {value && <div className="treatment-flow" aria-label="실제 진행과 예정 인계">
          <span className="is-done">✓ A · {value.input.originLabel || '배출사업장'}</span>
          {completed.map((step, index) => <span key={step.legId ?? index} className="is-done">
            ✓ {step.facility} · {step.process} 완료
          </span>)}
          {pending && <span className="is-current">
            {pending.facility} · {pending.handoff?.status === 'accepted' ? '✓ 수령' : handoffLabel(pending)}
          </span>}
          {!pending && lastStep && !finished && <span className="is-current">다음 업체 미정</span>}
        </div>}
        {saveError && <p role="alert">{saveError}</p>}
        {pending && <div className="treatment-status">
          <span>{trackingLabel}{pending.handoff?.respondedAt && ` · ${stamp(pending.handoff.respondedAt)}`}</span>
          <h3>{pending.facility}</h3><p>{pending.process} → {pending.output}</p>
          {pending.source?.reviewReference ? <p>담당자 확인 자료 · {pending.source.reviewReference}</p>
            : !pending.handoff && pending.intakeReview && <p>인계 전 확인 · {pending.intakeReview.next_check}</p>}
          {pending.internal ? <p>같은 사업장에서 공정을 이어가고 있어요.</p> :
            pending.handoff?.status === 'accepted' ? <p>업체가 수령을 확인했어요. 공정 처리 결과를 기다리고 있어요.</p> :
            pending.handoff?.status === 'rejected' ? <p>업체가 수령 문제를 기록했어요. 운송 건을 확인해 주세요.</p> :
            <p>업체 입고가 확인되면 여기에 표시돼요. <a href={`/wastes/${waste.id}?tab=transport${processorView ? '&view=processor' : ''}`}>운송 탭 열기</a></p>}
          {processorView && readyForTreatment(pending) && (
            needsPendingLookup && !reportableStep.outputStates?.length
              ? <p role="status">{fetchError || lookup?.message || '기존 인계 건의 산출물 선택지를 불러오고 있어요.'}
                {fetchError && <button type="button" onClick={() => { setFetchError(''); setAttempt(attempt + 1); }}>다시 조회</button>}</p>
              : <TreatmentResult key={pending.legId ?? pending.startedAt} step={reportableStep}
                onRecord={(result) => update((currentValue) => recordTreatmentResult({
                  ...currentValue, pending: reportableStep, initialPreviews: currentValue.initialPreviews ?? preview,
                }, result))} />
          )}
        </div>}
        {lastStep?.observedOutput && !pending && !finished && <div className="treatment-status">
          <h3>{lastStep.facility} 처리 결과</h3>
          <p>{lastStep.observedLabel} · {lastStep.observedOutput.mass_kg} kg · 순도
            {' '}{lastStep.observedOutput.purity_percent == null ? '미측정' : `${lastStep.observedOutput.purity_percent}%`}</p>
          {lastStep.observedOutput.review_reference && <p>산출물 확인 자료 · {lastStep.observedOutput.review_reference}</p>}
          {!processorView && lastStep.expectedState?.key && lastStep.observedOutput.state_key &&
            lastStep.expectedState.key !== lastStep.observedOutput.state_key && !lastStep.observedOutput.review_reference &&
            <p>예정 산출물과 달라 처리업체의 증빙 확인을 기다리고 있어요.</p>}
          {!processorView && <p>처리업체에서 다음 업체를 정하면 여기에 표시돼요.</p>}
        </div>}
        {finished && <div className="treatment-status">
          <h3>처리경로 추적을 마쳤어요</h3>
          <p>완료한 공정 {value.completed.length}개와 선택 업체는 기록 탭에서 볼 수 있어요.</p>
        </div>}
        {canChoose && !pending && !finished && <div className="treatment-options" aria-live="polite">
          {fetchError ? <div className="treatment-status" role="alert">
            <p>{fetchError}</p>
            <button className="button button-quiet" type="button" onClick={() => {
              setFetchError('');
              setAttempt(attempt + 1);
            }}>다시 조회</button>
          </div> : !lookup ? <p className="treatment-status">다음 공정을 찾고 있어요…</p> : <div>
            <div className="treatment-option-head">
              <div><small>공정 데이터 · 검수된 근거</small>
                <h3>지금 이어갈 수 있는 공정</h3><p>{lookup.message}</p>
                {lookup.status === 'review_required' && processorView && <form className="treatment-confirm" onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  if (data.get('confirmed') === 'on') update((previous) => reviewTreatmentOutput(previous, String(data.get('reference') || '')));
                }}>
                  <label>확인 자료 번호 <input name="reference" maxLength={160} required /></label>
                  <label><input name="confirmed" type="checkbox" required /> 증빙에서 실제 공정과 산출물을 확인했어요.</label>
                  <button className="button button-quiet" type="submit">확인 기록 저장</button>
                </form>}
                {lookup.basis === 'expected_output' && <p>이전 기록의 예상 산출물 기준으로 조회했어요.</p>}
                {lookup.can_finish && <p>{lookup.status === 'end_of_route'
                  ? '기록한 산출물이 공정 자료에 등록된 산출 상태이고, 이어지는 공정이 없어요.'
                  : '이 산출물에서 추적을 마치거나 아래 후속 공정을 이어갈 수 있어요.'}</p>}
                {lookup.options.length > 0 && <p>{value.completed.length
                  ? `거리 기준 출발지 · ${value.completed.at(-1).facility}`
                  : value.input.origin ? `배출사업장 A · ${value.input.originLabel || '등록된 배출 공장'}` : '등록된 배출 공장 위치 없음'}
                  {' · '}{candidatePins.length > 1 ? `직선거리 순 ${candidatePins.length}곳`
                    : candidatePins.length ? '직선거리 표시 1곳'
                      : facilities.some((facility) => sameFacility(lastStep, facility))
                        ? '같은 사업장 내부 공정 포함' : '거리 확인 가능한 업체 없음'}</p>}
                {lookup.options.length > 0 && <small>
                  전체 시설 후보 {facilityCount}곳
                  {firstHandoff ? ' · 지도는 사업장 공정 근거가 있는 후보만 표시' : ' · 검색 범위는 공개 공정 사례'}
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
              {(firstHandoff ? [
                ['사업장 공정 근거 있음', process.facilities.filter((facility) => facility.evidence_basis === 'published_site_process')],
                ['사업장 공정 추가 확인', process.facilities.filter((facility) => facility.evidence_basis !== 'published_site_process')],
              ] : [[null, process.facilities]]).filter(([, group]) => group.length).map(([label, group]) =>
                <section className="treatment-facility-group" key={label || 'facilities'}>
                  {label && <h5>{label}</h5>}
                  {group.map((facility) => <FacilityCard key={facility.capability_key} {...{
                    facility, firstHandoff, input: value.input, lastStep, facilityCount,
                  }} onPlan={(selected) => update((previous) => beginStep(previous, process, selected, {
                    outputStates: lookup.output_states, previews: lookup.process_previews,
                  }))} />)}
                </section>)}
              <RegistrySearch value={value} transition={process.transition_key}
                onPlan={(facility) => update((previous) => beginStep(previous, process, facility, {
                  outputStates: lookup.output_states, previews: lookup.process_previews,
                }))} />
            </article>)}
            {lookup.options.length > 0 && <small className="treatment-note">허가, 인수 여부와 수용량은 업체 확인이 필요합니다. 이 화면은 연락이나 배차를 실행하지 않습니다.</small>}
          </div>}
        </div>}
      </div>
    </section>;
  }

  function SavedTab({ waste, tab }) {
    const value = useStoredCase(waste.id) ?? getTreatmentCase(waste);
    if (!value) return null;
    if (tab === 'history') return <History value={value} />;
    return <section className="detail-panel treatment-history">
      <header><div><p>CLASSIFICATION</p><h2>기록한 분류</h2></div></header>
      <ul><li><strong>{value.input.waste_code} · {materialLabels[value.input.material]}</strong>
        <small>{forms[value.input.material]?.find(([key]) => key === value.input.input_form)?.[1]}</small></li></ul>
      {value.input.classificationProvisional && <p>문진 잠정 결과를 담당자가 확인한 기록이에요.</p>}
    </section>;
  }

  return { Confirm, LotProgress, Panel, RegistrySearch, SavedTab, Summary, SurveyMaterial };
}
