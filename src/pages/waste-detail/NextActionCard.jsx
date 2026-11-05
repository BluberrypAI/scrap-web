import { Icon } from '../../components/Icon.jsx';

export function NextActionCard({ waste, onOpenOverlay }) {
  return waste.status === '문진 중' ? (
    <section className="next-action-card" data-variant="문진 중">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>문진을 이어서 완료해 주세요</h2>
        <p>성상 및 배출 공정 · 8개 질문 중 5개까지 답변했어요.</p>
        <div className="survey-progress">
          <span
            style={{
              width: '62%',
            }}
          />
        </div>
        <small>62% 완료 · “수분 함량” 질문에서 중단</small>
      </div>
      <a className="button button-primary" href={`/wastes/${waste.id}/survey`}>
        이어서 하기
        <Icon name="arrow" size={17} />
      </a>
    </section>
  ) : waste.status === '후보' ? (
    <section className="next-action-card candidate-action" data-variant="후보">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>분류 후보를 확인하고 있어요</h2>
        <p>“용출시험 결과 납 함량이 3mg/L 이상인가요?” 답변으로 후보를 구분할 수 있어요.</p>
      </div>
      <div className="candidate-compare">
        {[
          ['후보 1 · 74%', '03-01-01', '철강슬래그'],
          ['후보 2 · 19%', '03-01-02', '비철금속광재'],
          ['후보 3 · 7%', '03-02-00', '분진류'],
        ].map(([e, t, n]) => (
          <article key={t}>
            <span>{e}</span>
            <strong>{t}</strong>
            <small>{n}</small>
          </article>
        ))}
      </div>
    </section>
  ) : waste.status === '확정' ? (
    <section className="next-action-card" data-variant="확정">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>분류가 확정되었어요</h2>
        <div className="confirmed-meta">
          <strong>{waste.code}</strong>
          <span>R3 · 유기물질의 재생·회수</span>
        </div>
        <p>확정된 분류와 R유형을 기준으로 처리 경로를 선택해 주세요.</p>
      </div>
      <a className="button button-primary" href={`/wastes/${waste.id}?tab=route`}>
        경로 선택
        <Icon name="arrow" size={17} />
      </a>
    </section>
  ) : waste.status === '분석 대기' ? (
    <section className="next-action-card" data-variant="분석 대기">
      <div className="action-copy">
        <span>다음 행동 · 의뢰 후 4일 경과</span>
        <h2>성상 분석 결과를 기다리고 있어요</h2>
        <div className="analysis-checklist">
          <span>
            <Icon name="check" size={14} />
            {' 수분 함량'}
          </span>
          <span>
            <Icon name="check" size={14} />
            {' 발열량'}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {' 중금속 6종'}
          </span>
        </div>
      </div>
      <button
        className="button button-primary"
        type="button"
        onClick={() => onOpenOverlay('analysis')}
      >
        결과 입력
      </button>
    </section>
  ) : waste.status === '처리 진행' ? (
    <section className="next-action-card" data-variant="처리 진행">
      <div className="action-copy">
        <span>다음 행동</span>
        <h2>처리가 진행 중이에요</h2>
        <div className="mini-timeline">
          <span className="is-done">인계 완료</span>
          <span className="is-current">중간 처리</span>
          <span>최종 확인</span>
        </div>
        <p>한결자원순환 · 중화 처리 단계가 진행 중입니다.</p>
      </div>
      <button
        className="button button-primary"
        type="button"
        onClick={() => onOpenOverlay('stage')}
      >
        상태 업데이트
      </button>
    </section>
  ) : (
    <section className="next-action-card complete-action" data-variant="완료">
      <div className="action-copy">
        <span>처리 완료</span>
        <h2>순환 경로가 완료되었어요</h2>
        <div className="complete-route">
          <span>(주)가천정밀</span>
          <Icon name="arrow" size={15} />
          <span>에코순환환경</span>
          <Icon name="arrow" size={15} />
          <span>재생연료유</span>
        </div>
        <p>2026. 10. 21 완료 · 재활용량 8.4톤</p>
      </div>
      <a className="button button-primary" href={`/wastes/${waste.id}/report`}>
        결과지 보기
        <Icon name="arrow" size={17} />
      </a>
    </section>
  );
}
