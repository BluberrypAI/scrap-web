import { Icon } from '../../components/Icon.jsx';
import { wastes } from '../../data/wastes.js';

export function DataTable({ type }) {
  let t = type === 'analysis',
    n = wastes.filter((e) => e.status === '완료'),
    r = [
      ['폐유', '06-01-01', '수분 3.2% · 발열량 8,120', '2026. 11. 04'],
      ['폐수 슬러지', '51-02-01', '함수율 72.8% · pH 7.4', '2026. 10. 21'],
      ['폐흡착제', '51-08-01', '유분 12.1% · 회분 41.3%', '2026. 09. 30'],
    ];
  return (
    <section className="data-table-panel">
      <header>
        <div>
          <h2>{t ? '분석 결과 기록' : '처리 이력'}</h2>
          <p>
            {t ? '최근 등록된 성상 분석 결과입니다.' : '처리가 완료된 폐기물과 처리 보고서입니다.'}
          </p>
        </div>
        <span>{t ? '최근 3건' : `완료 ${n.length}건`}</span>
      </header>
      <div className="data-table" data-type={type}>
        <div className="data-table-head">
          <span>폐기물</span>
          <span>{t ? '분류번호' : '처리업체'}</span>
          <span>{t ? '주요 결과' : '처리 상태'}</span>
          <span>기록일</span>
          {!t && <span>보고서</span>}
        </div>
        {t
          ? r.map((t) => (
              <div className="data-table-row" key={`${type}-${t[0]}`}>
                {t.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </div>
            ))
          : n.map((e) => (
              <div className="data-table-row" key={e.id}>
                <span>{e.name}</span>
                <span>에코순환환경</span>
                <span>재활용 완료</span>
                <span>{e.updatedAt}</span>
                <a className="report-link" href={`/wastes/${e.id}/report`}>
                  보고서 보기
                  <Icon name="arrow" size={14} />
                </a>
              </div>
            ))}
      </div>
    </section>
  );
}
