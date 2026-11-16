import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { diagnosisApi } from '../../features/diagnosis/index.jsx';
import { factLabel } from '../../features/diagnosis/lib/normalize.js';
import { workflowApi } from '../../features/workflow/api.js';
import { STATE_LABEL, formatKg, lotTitle } from '../../features/workflow/labels.js';

// 분석 결과는 최근 문진 건 몇 개의 서류 값만 모은다 (건마다 상세를 한 번씩 부름)
const RECENT_CASES = 10;

function formatDay(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}`;
}

function showValue(value, unit) {
  if (value && typeof value === 'object') {
    if ('hi' in value || 'lo' in value) return `${value.lo ?? ''}~${value.hi ?? ''}${unit || ''}`;
    return JSON.stringify(value);
  }
  return `${value}${unit ? ` ${unit}` : ''}`;
}

// 처리 이력: 완료된 처리 건 (server /workflow/lots)
async function loadHistory() {
  const lots = await workflowApi.listLots();
  return lots
    .filter((lot) => lot.status === 'completed')
    .map((lot) => {
      const steps = lot.data.completed;
      const finished = [...(lot.data.events || [])].reverse().find((e) => e.action === '처리 완료 확인');
      return {
        id: lot.id,
        name: lotTitle(lot),
        facility: steps.at(-1)?.facility || '-',
        result: `${STATE_LABEL[lot.data.current.state_key] || lot.data.current.state_key} ${formatKg(lot.data.current.mass_kg)}`,
        date: formatDay(finished?.at),
      };
    });
}

// 분석 결과: 문진에 올린 서류에서 검수해 반영한 값 (엔진 서류 값, APPLIED)
async function loadAnalyses() {
  const page = await diagnosisApi.listCases(1, RECENT_CASES);
  const details = await Promise.all(page.items.map((c) => diagnosisApi.getCase(c.id).catch(() => null)));
  const rows = [];
  for (const detail of details.filter(Boolean)) {
    for (const doc of detail.documents) {
      const values = (doc.values || []).filter((v) => v.status === 'APPLIED');
      if (!values.length) continue;
      rows.push({
        id: doc.id,
        name: detail.case.summary?.title || doc.filename,
        code: detail.case.summary?.code || '미정',
        result: values.map((v) => `${factLabel(v.fact_key) || v.fact_key} ${showValue(v.value, v.unit)}`).join(' · '),
        date: formatDay(values.at(-1).reviewed_at || doc.created_at),
        caseId: detail.case.id,
      });
    }
  }
  return rows;
}

export function DataTable({ type }) {
  const analysis = type === 'analysis';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setRows(null);
    setError('');
    (analysis ? loadAnalyses() : loadHistory())
      .then((list) => live && setRows(list))
      .catch((e) => live && (setRows([]), setError(e.message)));
    return () => {
      live = false;
    };
  }, [analysis]);

  return (
    <section className="data-table-panel">
      <header>
        <div>
          <h2>{analysis ? '분석 결과' : '처리 이력'}</h2>
          <p>
            {analysis ? '문진에 올린 서류에서 검수해 반영한 값입니다.' : '재활용 완료까지 기록된 처리 건입니다.'}
          </p>
        </div>
        <span>{rows ? (analysis ? `${rows.length}건` : `완료 ${rows.length}건`) : ''}</span>
      </header>
      <div className="data-table" data-type={type}>
        <div className="data-table-head">
          <span>폐기물</span>
          <span>{analysis ? '분류번호' : '마지막 처리업체'}</span>
          <span>{analysis ? '주요 결과' : '최종 산출물'}</span>
          <span>기록일</span>
          <span>{analysis ? '문진' : '기록'}</span>
        </div>
        {rows === null && <p className="data-table-empty">불러오는 중…</p>}
        {error && <p className="data-table-empty" role="alert">{error}</p>}
        {rows?.length === 0 && !error && (
          <p className="data-table-empty">{analysis ? '반영한 서류 값이 아직 없어요.' : '완료된 처리 건이 아직 없어요.'}</p>
        )}
        {rows?.map((row) => (
          <div className="data-table-row" key={row.id}>
            <span>{row.name}</span>
            <span>{analysis ? row.code : row.facility}</span>
            <span>{row.result}</span>
            <span>{row.date}</span>
            <a className="report-link" href={analysis ? `/wastes/case-${row.caseId}/survey` : `/lots/${row.id}`}>
              {analysis ? '문진 보기' : '기록 보기'}
              <Icon name="arrow" size={14} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
