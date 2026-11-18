import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { caseToWaste } from '../../data/diagnosisCases.js';
import { workflowApi } from '../../features/workflow/api.js';
import { lotCardStatus, lotCardText, lotToWaste } from '../../features/workflow/labels.js';
import { api } from '../../lib/api.js';
import { currentRoute, navigate } from '../../lib/router.js';
import './WastesPage.css';
import { EmptyState } from './EmptyState.jsx';
import { WasteCard } from './WasteCard.jsx';

const stages = [
  {
    id: 'classification',
    number: '01',
    label: '폐기물 분류',
    description: '문진과 분석을 거쳐 폐기물의 분류를 확인해요.',
    statuses: ['문진 중', '후보', '분석 대기'],
  },
  {
    id: 'route',
    number: '02',
    label: '업체 연결',
    description: '분류가 확정된 폐기물의 처리경로를 살펴봐요.',
    statuses: ['확정'],
  },
  {
    id: 'treatment',
    number: '03',
    label: '처리 추적',
    description: '인계된 폐기물의 현재 처리 상태를 확인해요.',
    statuses: ['처리 진행'],
  },
];

function WasteList({ variant, onCreate, creating, createdWasteId, wastes }) {
  const createdWaste = wastes.find((waste) => waste.id === createdWasteId);
  const createdStage = stages.find((stage) => stage.statuses.includes(createdWaste?.status));
  const ongoing = wastes.filter((waste) => waste.status !== '완료');

  useEffect(() => {
    if (variant !== 'list' || !createdStage) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`waste-stage-${createdStage.id}`)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [createdStage, variant]);

  return (
    <div className="home-content" data-layer-name="L1-Home" data-variant={variant}>
      <header className="page-header">
        <div>
          <p>RECYCLING ROUTE</p>
          <div className="page-title-row">
            <h1>자원 경로</h1>
          </div>
          <span className="page-lead">분류부터 처리까지, 폐기물마다 어디까지 진행됐는지 한눈에 확인하세요.</span>
          <a className="completed-history-link" href="/data?tab=history">
            처리 완료 이력 보기
            <Icon name="arrow" size={15} />
          </a>
        </div>
        <button className="button button-primary create-button" type="button" onClick={onCreate} disabled={creating}>
          <Icon name="plus" size={18} />{creating ? '문진 준비 중…' : '새 폐기물 문진'}
        </button>
      </header>
      {variant === 'list' ? (
        <>
          <div className="waste-stage-content">
            {stages.map((stage) => {
              const stageWastes = ongoing.filter((waste) => stage.statuses.includes(waste.status));
              return (
                <section
                  className="waste-stage-section"
                  data-stage={stage.number}
                  id={`waste-stage-${stage.id}`}
                  key={stage.id}
                  aria-labelledby={`waste-stage-heading-${stage.id}`}
                >
                  <div className="waste-stage-panel-heading">
                    <div>
                      <span>STEP {stage.number}</span>
                      <h2 id={`waste-stage-heading-${stage.id}`}>{stage.label}</h2>
                      <p>{stage.description}</p>
                    </div>
                    <strong>{stageWastes.length}건</strong>
                  </div>
                  {createdStage?.id === stage.id && (
                    <div className="waste-created-notice" role="status">
                      <Icon name="check" size={18} />
                      <div>
                        <strong>STEP {stage.number} · {stage.label}</strong>
                        <p>
                          <b>{createdWaste.name}</b> 카드가 만들어졌어요. 카드를 눌러 처리경로를 확인해 주세요.
                        </p>
                      </div>
                    </div>
                  )}
                  {stageWastes.length ? (
                    <div className="waste-grid" aria-label={`${stage.label} 폐기물 목록`}>
                      {stageWastes.map((waste) => (
                        <WasteCard
                          waste={waste}
                          step={stage.number}
                          isNew={waste.id === createdWasteId}
                          key={waste.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="waste-stage-empty">이 단계에 있는 폐기물이 없어요.</p>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState onCreate={onCreate} creating={creating} />
      )}
    </div>
  );
}

// 우리 문진으로 만든 처리 건은 그 문진 카드에 진행 상태를 덮고,
// 다른 기업이 보낸 처리 건(우리가 요청받았거나 지금 처리 중)은 별도 카드로 넣는다
function mergeLots(cards, lots, myCompanyId) {
  // 문진 목록은 이미 로그인 기업 소유로 제한된다. 기업 프로필 조회가 실패해도
  // 같은 case_id의 처리 건은 카드에 연결해야 STEP 3 경로가 사라지지 않는다.
  const byCase = new Map(lots.filter((l) => l.data?.handoff?.case_id).map((l) => [l.data.handoff.case_id, l]));
  const merged = cards.map((card) => {
    const lot = byCase.get(card.caseId);
    return lot
      ? { ...card, lot, status: lotCardStatus(lot.status), ...lotCardText(lot, myCompanyId), href: `/wastes/${card.id}` }
      : card;
  });
  const cardCaseIds = new Set(cards.map((card) => card.caseId));
  const received = lots.filter((l) => !cardCaseIds.has(l.data?.handoff?.case_id)).map((l) => lotToWaste(l, myCompanyId));
  return [...received, ...merged];
}

export function WastesPage() {
  const params = new URLSearchParams(currentRoute().search);
  // 카드는 문진 엔진의 실제 건 목록으로 채운다 (server /api/v1/diagnosis/cases)
  const [wastes, setWastes] = useState(null);
  const [problem, setProblem] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    // 처리 건(기업 간 인계)은 목록을 못 불러와도 문진 카드는 보여 준다
    Promise.all([
      api.diagnosis.listCases(),
      workflowApi.listLots().catch(() => { setProblem('처리 건을 불러오지 못해 진행 경로를 표시할 수 없어요. 새로고침해 주세요.'); return []; }),
      api.myCompany().catch(() => null),
    ])
      .then(([page, lots, company]) => setWastes(mergeLots(page.items.map(caseToWaste), lots, company?.id)))
      .catch((error) => {
        setWastes([]);
        setProblem(error?.message || '폐기물 목록을 불러오지 못했어요.');
      });
  }, []);
  if (wastes === null) return <div className="home-content" role="status" aria-busy="true">폐기물과 처리 현황을 불러오는 중이에요…</div>;
  const createCase = async () => {
    if (creating) return;
    setCreating(true);
    setProblem('');
    try {
      const created = await api.diagnosis.createCase({});
      navigate(`/wastes/case-${created.case.id}/survey`);
    } catch (error) {
      setProblem(error?.message || '문진을 시작하지 못했어요. 다시 시도해 주세요.');
      setCreating(false);
    }
  };
  const variant = params.get('variant') === 'empty' || !wastes.length ? 'empty' : 'list';
  return (
    <>
      {problem && (
        <p className="waste-stage-empty" role="alert">
          {problem}
        </p>
      )}
      <WasteList
        wastes={wastes}
        variant={variant}
        creating={creating}
        createdWasteId={params.get('created')}
        onCreate={createCase}
      />
    </>
  );
}
