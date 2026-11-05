import { Icon } from '../../components/Icon.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { progressSteps, stageIndex } from '../../data/wastes.js';

export function DetailPanel({ waste, tab, onOpenLegal }) {
  if (tab === 'classification') {
    let t =
      waste.status === '문진 중'
        ? '문진 완료 후 산출'
        : waste.status === '후보'
          ? '최고 후보 74%'
          : '확정 신뢰도 96%';
    return (
      <section className="detail-panel classification-panel">
        <header>
          <div>
            <p>CLASSIFICATION</p>
            <h2>AI 분류 요약</h2>
          </div>
          <StatusBadge status={waste.status} />
        </header>
        <div className="classification-grid">
          <article>
            <span>분류번호</span>
            <strong>{waste.status === '문진 중' ? '분류 중' : waste.code}</strong>
            {waste.status !== '문진 중' && (
              <button type="button" onClick={onOpenLegal}>
                근거 조문 보기
              </button>
            )}
          </article>
          <article>
            <span>폐기물 유형</span>
            <strong>{waste.category}</strong>
            <small>사업장폐기물 · 일반</small>
          </article>
          <article>
            <span>AI 판단</span>
            <strong>{t}</strong>
            <small>{waste.status === '후보' ? '추가 질문 1개 필요' : '입력 정보 기반'}</small>
          </article>
          <article>
            <span>권장 R유형</span>
            <strong>{waste.status === '완료' ? 'R1' : 'R3'}</strong>
            <small>재생·회수 우선 검토</small>
            <button type="button" onClick={onOpenLegal}>
              R코드 근거 보기
            </button>
          </article>
        </div>
        <div className="classification-note">
          <Icon name="spark" size={19} />
          <p>
            {waste.status === '후보'
              ? '용출시험의 납 함량 결과를 입력하면 두 후보를 구분할 수 있습니다.'
              : `${waste.name}의 배출 공정과 성상 정보를 환경부 분류 기준과 비교한 결과입니다.`}
          </p>
        </div>
      </section>
    );
  }
  if (tab === 'route') {
    let t = stageIndex(waste.status);
    return (
      <section className="detail-panel route-panel">
        <header>
          <div>
            <p>CIRCULAR ROUTE</p>
            <h2>처리경로</h2>
          </div>
          <span>
            {t + 1}
            {' / '}
            {progressSteps.length}
            {' 단계'}
          </span>
        </header>
        <div className="route-timeline">
          {progressSteps.map((e, n) => (
            <article className={n < t ? 'is-done' : n === t ? 'is-current' : ''} key={e}>
              <span>{n < t ? <Icon name="check" size={15} /> : n + 1}</span>
              <div>
                <strong>{e}</strong>
                <small>{n < t ? '완료' : n === t ? '현재 단계' : '예정'}</small>
              </div>
            </article>
          ))}
        </div>
        <div className="route-detail-row">
          <span>예상 처리 방식</span>
          <strong>
            {waste.status === '완료' ? '연료화 재활용 완료' : '중간 처리 후 원료 재활용'}
          </strong>
          <span>매칭 업체</span>
          <strong>{t >= 2 ? '에코순환환경' : '경로 확정 후 표시'}</strong>
        </div>
      </section>
    );
  }
  let r = [
    ['폐기물 등록', `${waste.name} 기본 정보가 등록되었습니다.`, '2026. 11. 04 · 09:42'],
    ['AI 분류 검토', `${waste.code} 분류 후보가 생성되었습니다.`, '2026. 11. 04 · 10:08'],
    ['처리업체 매칭', '조건에 맞는 처리업체 8곳을 찾았습니다.', '2026. 11. 05 · 14:20'],
    ['처리 진행', '중간 처리 단계로 변경되었습니다.', '2026. 11. 07 · 11:15'],
    ['처리 완료', '처리 결과지와 재활용 실적이 등록되었습니다.', '2026. 11. 12 · 16:30'],
  ]
    .slice(0, stageIndex(waste.status) + 1)
    .reverse();
  return (
    <section className="detail-panel history-panel">
      <header>
        <div>
          <p>ACTIVITY LOG</p>
          <h2>변경 기록</h2>
        </div>
        <span>
          {'최근 '}
          {r.length}건
        </span>
      </header>
      <div className="history-list">
        {r.map(([e, t, n], r) => (
          <article key={e}>
            <span className={r === 0 ? 'is-latest' : ''} />
            <div>
              <strong>{e}</strong>
              <p>{t}</p>
            </div>
            <time>{n}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
