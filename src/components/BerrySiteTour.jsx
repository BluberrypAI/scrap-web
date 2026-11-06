import { useEffect, useRef, useState } from 'react';
import berryAvatar from '../assets/berry.png';
import { navigate } from '../lib/router.js';
import { AnimatedContent } from '../pages/landing/LandingMotion.jsx';

const storageKey = 'scrap-site-tour-v2';
const steps = [
  {
    path: '/',
    title: 'SCRAP 시작 화면',
    description: 'SCRAP이 어떤 서비스인지 한눈에 볼 수 있는 첫 화면이에요.',
  },
  {
    path: '/about',
    title: '기업소개',
    description: 'SCRAP이 어떤 일을 하는지 소개하는 페이지예요.',
  },
  {
    path: '/wastes',
    title: '재활용 경로',
    description: '내 폐기물과 각각의 처리경로를 확인하는 페이지예요.',
  },
  {
    path: '/map',
    title: '순환자원지도',
    description: '처리업체와 자원 순환 경로를 지도에서 살펴볼 수 있어요.',
  },
  {
    path: '/data',
    title: '계정 설정',
    description: '사업장 정보와 분석 결과 기록, 처리 이력을 확인할 수 있어요.',
  },
];

function storedStep() {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === 'done') return null;
    const step = Number(value);
    return value !== null && Number.isInteger(step) && step >= 0 && step < steps.length
      ? step
      : 0;
  } catch {
    return 0;
  }
}

export function BerrySiteTour({ path }) {
  const [step, setStep] = useState(storedStep);
  const [visible, setVisible] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (step === null || path !== steps[step].path) return;
    if (step === 0) {
      const timer = window.setTimeout(() => setVisible(true), 1000);
      return () => window.clearTimeout(timer);
    }
    setVisible(true);
  }, [path, step]);

  useEffect(() => {
    if (visible) confirmRef.current?.focus();
  }, [visible]);

  if (!visible || step === null || path !== steps[step].path) return null;

  const confirm = () => {
    const next = step + 1;
    try {
      localStorage.setItem(storageKey, next === steps.length ? 'done' : String(next));
    } catch {
      // 저장소를 사용할 수 없어도 현재 화면의 안내는 진행할 수 있다.
    }
    setVisible(false);
    if (next === steps.length) {
      setStep(null);
      navigate('/');
    } else {
      setStep(next);
      navigate(next === steps.length - 1 ? '/data?tab=workplace' : steps[next].path);
    }
  };

  return (
    <div className="berry-site-tour-backdrop">
      <section
        className="berry-site-tour"
        role="dialog"
        aria-modal="true"
        aria-labelledby="berry-site-tour-title"
        aria-describedby="berry-site-tour-description"
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            confirmRef.current?.focus();
          }
        }}
      >
        <AnimatedContent className="berry-site-tour-avatar">
          <img src={berryAvatar} alt="에이전트 베리" />
        </AnimatedContent>
        <AnimatedContent className="berry-site-tour-copy" delay={160}>
          <span>베리의 안내 · {step + 1}/{steps.length}</span>
          <h2 id="berry-site-tour-title">{steps[step].title}</h2>
          <p id="berry-site-tour-description">{steps[step].description}</p>
          <button ref={confirmRef} type="button" onClick={confirm}>확인했어요</button>
        </AnimatedContent>
      </section>
    </div>
  );
}
