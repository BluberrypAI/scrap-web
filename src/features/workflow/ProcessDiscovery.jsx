import { useState } from 'react';

const regions = { capital: '서울·인천·경기', chungcheong: '대전·세종·충남·충북', honam: '광주·전남·전북', southeast: '부산·울산·경남', daegyeong: '대구·경북', gangwon: '강원', jeju: '제주' };

export function ProcessDiscovery({ option }) {
  const [region, setRegion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!option.web_search_form) return null;
  async function search() {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/treatment/facility-web-search', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition_key: option.transition_key, input_form: option.web_search_form, region }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (response.status === 401 ? '로그인 상태를 확인해 주세요.' : '업체 조사를 요청하지 못했어요.'));
      setResult(data);
    } catch (e) { setError(e.message || '연결 상태를 확인하고 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <details className="wf-more">
    <summary>이 공정의 다른 업체 조사</summary>
    <p className="wf-muted">현재 투입 형태와 공정으로 공개 자료를 찾아요. 검색된 업체는 사업장·반입 조건을 대조한 뒤 인계 후보에 연결해야 해요.</p>
    <div className="wf-actions">
      <label>조사할 지역 <select value={region} disabled={busy} onChange={e => { setRegion(e.target.value); setResult(null); }}>
        <option value="">지역 선택</option>
        {Object.entries(regions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <button type="button" className="button button-quiet button-small" disabled={busy || !region} onClick={search}>
        {busy ? '공개 근거를 찾는 중…' : '추가 업체 조사'}
      </button>
    </div>
    {error && <p role="alert">{error}</p>}
    {result?.status === 'unavailable' && <p role="status">지금은 검색을 완료하지 못했어요. 업체가 없다는 뜻은 아니에요. 다시 시도해 주세요.</p>}
    {result?.status === 'searched' && (!result.leads?.length
      ? <p role="status">이 지역·투입 형태의 공개 근거를 찾지 못했어요. 다른 지역을 조사하거나 업체 반입 자료를 확인해 주세요.</p>
      : <ul>{result.leads.map((lead, i) => <li key={`${lead.url}-${i}`}>
        <a href={lead.url} target="_blank" rel="noreferrer">{lead.site}</a> · {lead.address || '사업장 주소 추가 확인'}
        <p>{lead.process}</p>
      </li>)}</ul>)}
  </details>;
}
