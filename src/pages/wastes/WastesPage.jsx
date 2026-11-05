import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { wastes } from '../../data/wastes.js';
import { currentRoute, navigate } from '../../lib/router.js';
import { AnalysisResultModal } from './AnalysisResultModal.jsx';
import { EmptyState } from './EmptyState.jsx';
import { WasteCard } from './WasteCard.jsx';

function WasteList({ variant, onOpenAnalysis, onCreate }) {
  let r = wastes.filter((e) => e.status !== '완료'),
    i = wastes.length - r.length,
    a = variant === 'list' && wastes.some((e) => e.status === '분석 대기');
  return (
    <div className="home-content" data-layer-name="L1-Home" data-variant={variant}>
      {a && (
        <section className="continue-banner">
          <div className="continue-message">
            <span className="lime-status" />
            <div>
              <span>이어서 하기</span>
              <p>
                <strong>폐유</strong>
                {' 분석결과 입력을 대기중입니다.'}
              </p>
            </div>
          </div>
          <a className="button banner-button" href="/wastes/waste-oil">
            이어서 진행
            <Icon name="arrow" size={17} />
          </a>
        </section>
      )}
      <header className="page-header">
        <div>
          <p>RECYCLING ROUTE</p>
          <h1>내 폐기물</h1>
          {variant === 'list' && (
            <span>
              {'진행 중 '}
              {r.length}개
            </span>
          )}
        </div>
        <button className="button button-primary create-button" type="button" onClick={onCreate}>
          <Icon name="plus" size={18} />새 폐기물 문진
        </button>
      </header>
      {variant === 'list' ? (
        <section className="waste-grid" aria-label="폐기물 목록">
          {r.map((e) => (
            <WasteCard waste={e} key={e.id} />
          ))}
        </section>
      ) : (
        <EmptyState onCreate={onCreate} />
      )}
      {variant === 'list' && i > 0 && (
        <a className="completed-note" href="/data?tab=history">
          <Icon name="check" size={16} />
          <span>
            {'처리가 끝난 폐기물 '}
            {i}건은 기업 데이터 관리의 처리 이력에서 보고서와 함께 볼 수 있어요
          </span>
          <Icon name="arrow" size={16} />
        </a>
      )}
    </div>
  );
}
export function WastesPage() {
  let [e, t] = useState(false),
    [n, r] = useState(false),
    i = useMemo(
      () =>
        new URLSearchParams(currentRoute().search).get('variant') === 'empty' ? 'empty' : 'list',
      [],
    );
  return (
    useEffect(() => {
      let e = () => t(false);
      return (
        window.addEventListener('popstate', e),
        () => window.removeEventListener('popstate', e)
      );
    }, []),
    useEffect(() => {
      if (!e) return;
      let t = (e) => {
        e.key === 'Escape' && window.history.back();
      };
      return (
        window.addEventListener('keydown', t),
        () => window.removeEventListener('keydown', t)
      );
    }, [e]),
    (
      <>
        <WasteList
          variant={i}
          onOpenAnalysis={() => {
            (window.history.pushState(
              {
                overlay: 'analysis-result',
              },
              '',
            ),
              t(true));
          }}
          onCreate={() => {
            navigate(`/wastes/lot-${crypto.randomUUID()}/survey`);
          }}
        />
        {e && (
          <AnalysisResultModal
            waste={wastes[1]}
            onClose={() => {
              window.history.state?.overlay === 'analysis-result'
                ? window.history.back()
                : t(false);
            }}
          />
        )}
        {n && (
          <div className="toast" role="status">
            <Icon name="spark" size={18} />
            <span>새 폐기물 문진 화면으로 연결됩니다.</span>
            <button type="button" onClick={() => r(false)} aria-label="알림 닫기">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </>
    )
  );
}
