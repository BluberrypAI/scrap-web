import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { WorkBar } from '../../components/WorkBar.jsx';
import { diagnosisApi } from '../../features/diagnosis/index.jsx';
import { useSession } from '../../hooks/useSession.js';
import { navigate } from '../../lib/router.js';
import { BerryDock } from './BerryDock.jsx';
import { intakeExamples } from './surveyData.js';

// 두 진입 경로 모두 서버에 문진 건을 만들고 실제 엔진 화면으로 이동한다.
export function SurveyPage({ waste }) {
  const { company, status } = useSession();
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!memo && !busy) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [memo, busy]);

  async function start(useMemo) {
    if (pending.current || status !== 'ready' || !company || (useMemo && !memo.trim())) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const created = await diagnosisApi.createCase(useMemo ? { memo: memo.trim() } : {});
      if (mounted.current) navigate(`/wastes/case-${created.case.id}/survey`);
    } catch (error) {
      if (mounted.current) {
        setError(error?.message || '문진을 시작하지 못했어요. 다시 시도해 주세요.');
        setBusy(false);
      }
    } finally { pending.current = false; }
  }
  function exit() {
    if (busy) return;
    if (memo.trim()) setLeaving(true);
    else navigate('/wastes');
  }
  return (
    <div className="l3-page sv-page" data-layer-name="L3-Survey" aria-busy={busy}>
      <WorkBar waste={{ ...waste, name: '새 폐기물 문진' }} saveState={busy ? 'creating' : 'draft'} onExit={exit} />
      <main className="sv-intake" data-layer-name="Survey-Intake">
        <p className="sv-context">{company?.company_name || '기업 정보 확인 중…'} · 새 폐기물 문진</p>
        <h1>어떤 폐기물인가요?</h1>
        <p className="sv-helper">어떤 공정에서 무엇이 나오는지 편하게 적어 주세요. 설명 없이 질문부터 시작해도 돼요.</p>
        <textarea className="sv-textarea" rows={5} value={memo} maxLength={4000}
          onChange={(e) => setMemo(e.target.value)} placeholder="예) 사출 공장에서 나오는 플라스틱 불량품이에요"
          disabled={busy} aria-label="폐기물 설명" />
        <div className="sv-examples"><span>예시</span>{intakeExamples.map((text) => (
          <button type="button" onClick={() => setMemo(text)} disabled={busy} key={text}>{text}</button>
        ))}</div>
        {error && <p role="alert">{error}</p>}
        {busy && <p role="status">문진을 준비하고 있어요. 화면을 닫지 말고 잠시 기다려 주세요.</p>}
        <footer className="survey-actions">
          <button className="button button-quiet" type="button" onClick={() => start(false)} disabled={busy || !company}>
            질문으로 바로 시작
          </button>
          <button className="button button-primary" type="button" onClick={() => start(true)} disabled={busy || !company || !memo.trim()}>
            {busy ? '문진 준비 중…' : '베리에게 알려주기'}<Icon name="arrow" size={17} />
          </button>
        </footer>
      </main>
      <BerryDock message={busy ? '사업장 정보를 확인하고 필요한 질문을 준비하고 있어요' : error || '아래에서 질문을 시작하거나 폐기물 상태를 알려주세요'} />
      {leaving && <div className="l3-exit-backdrop" role="presentation">
        <section className="l3-exit-modal" role="dialog" aria-modal="true" aria-labelledby="draft-exit-title">
          <h2 id="draft-exit-title">아직 문진을 시작하지 않았어요</h2><p>입력한 설명은 저장되지 않았어요. 나가면 지워집니다.</p>
          <div><button className="button button-quiet" onClick={() => setLeaving(false)}>계속 작성하기</button>
            <button className="button button-primary" onClick={() => navigate('/wastes')}>나가기</button></div>
        </section>
      </div>}
    </div>
  );
}
