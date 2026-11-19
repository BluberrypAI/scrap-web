import { useEffect, useRef, useState } from 'react';
import { diagnosisApi } from '../../features/diagnosis/index.jsx';
import { useSession } from '../../hooks/useSession.js';
import { navigate } from '../../lib/router.js';

// 예전 상세 화면의 /survey 진입도 별도 시작 화면 없이 문진 건을 만든 뒤 채팅으로 바로 보낸다.
export function SurveyPage() {
  const { company, status } = useSession();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    if (pending.current || status !== 'ready' || !company) return undefined;
    let live = true;
    pending.current = true;
    setError('');
    diagnosisApi.createCase({})
      .then((created) => {
        if (live) navigate(`/wastes/case-${created.case.id}/survey`);
      })
      .catch((error) => {
        if (!live) return;
        setError(error?.message || '문진을 시작하지 못했어요. 다시 시도해 주세요.');
        pending.current = false;
      });
    return () => { live = false; };
  }, [attempt, company, status]);

  return (
    <main className="session-gate" role={error ? 'alert' : 'status'} aria-busy={!error}>
      <p>{error || '문진 채팅을 준비하고 있어요…'}</p>
      {error && (
        <button className="button button-primary" type="button" onClick={() => setAttempt((value) => value + 1)}>
          다시 시도
        </button>
      )}
    </main>
  );
}
