import { ArrowUpRightIcon } from '../../components/LandingIcons.jsx';
import { SiteFooter } from '../../components/SiteFooter.jsx';
import { navItems } from '../../data/navigation.js';
import {
  aboutWhy,
  handlingSteps,
  recycleExamples,
  usageFlow,
  wasteCategories,
} from './aboutContent.js';

export function AboutPage() {
  return (
    <main className="landing-page about-page" data-layer-name="About-Company" data-theme="light">
      <header className="landing-header">
        <a className="landing-wordmark" href="/" data-layer-name="Logo" aria-label="SCRAP 홈">
          SCRAP<span>.</span>
        </a>
        <nav className="landing-nav" aria-label="주요 메뉴">
          {navItems.map((e) => (
            <a
              href={e.href}
              className={e.href === '/about' ? 'is-active' : undefined}
              aria-current={e.href === '/about' ? 'page' : undefined}
              key={e.href}
            >
              {e.label}
            </a>
          ))}
        </nav>
        <div className="landing-header-actions">
          <button type="button">로그인</button>
          <a className="landing-button landing-button-primary landing-button-small" href="/login">
            시작하기
            <ArrowUpRightIcon />
          </a>
        </div>
      </header>
      <section className="about-hero" aria-labelledby="about-title">
        <p className="about-eyebrow">ABOUT SCRAP</p>
        <h1 id="about-title">
          버려지는 자원을
          <br />
          <span>연결하고 추적하는 기업</span>
        </h1>
        <p className="about-lead">
          SCRAP은 사업장에서 나오는 폐기물을 분류부터 처리업체로 넘기는 과정까지 이어주는
          재활용자원순환 네비게이터입니다.
        </p>
      </section>
      <section className="about-section" aria-labelledby="about-why">
        <div className="about-heading">
          <p className="about-eyebrow">WHY SCRAP</p>
          <h2 id="about-why">우리가 하는 일</h2>
        </div>
        <div className="about-grid about-grid-3">
          {aboutWhy.map(([e, t, n]) => (
            <article className="about-card" key={e}>
              <span className="about-num">{e}</span>
              <h3>{t}</h3>
              <p>{n}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-section" aria-labelledby="about-class">
        <div className="about-heading">
          <p className="about-eyebrow">BASICS 01</p>
          <h2 id="about-class">폐기물은 이렇게 나뉩니다</h2>
          <p>
            법령상 폐기물은 먼저 배출 주체에 따라 나뉘고, 사업장폐기물은 다시 위험성에 따라
            구분됩니다. 공식 용어에 ‘등급’은 없고 ‘분류’와 ‘분류번호’로 관리합니다.
          </p>
        </div>
        <div className="about-grid about-grid-3">
          {wasteCategories.map((e) => (
            <article className={`about-card about-category about-category-${e.tone}`} key={e.name}>
              <h3>{e.name}</h3>
              <p>{e.desc}</p>
              <small>
                {'예) '}
                {e.example}
              </small>
            </article>
          ))}
        </div>
        <div className="about-code">
          <div>
            <p className="about-eyebrow">분류번호 읽는 법</p>
            <strong>51-03-01</strong>
          </div>
          <ul>
            <li>
              <b>51-03</b>
              {' 중분류: 폐합성고분자화합물'}
            </li>
            <li>
              <b>51-03-01</b>
              {' 세부 품목: 폐합성수지류 (폐염화비닐수지류는 제외)'}
            </li>
            <li>
              {'같은 합성수지도 '}
              <b>고체이면 지정폐기물이 아니고</b>, 액상이나 반고상이면 달라질 수 있어 문진에서 먼저
              확인합니다.
            </li>
          </ul>
        </div>
      </section>
      <section className="about-section" aria-labelledby="about-handling">
        <div className="about-heading">
          <p className="about-eyebrow">BASICS 02</p>
          <h2 id="about-handling">어떻게 처리하나요</h2>
          <p>
            처리는 재활용을 먼저 검토하고, 필요하면 중간처리를 거쳐 남은 것을 최종 처리하는 순서로
            이어집니다.
          </p>
        </div>
        <div className="about-grid about-grid-3">
          {handlingSteps.map(([e, t], n) => (
            <article className="about-card" key={e}>
              <span className="about-num">{`0${n + 1}`}</span>
              <h3>{e}</h3>
              <p>{t}</p>
            </article>
          ))}
        </div>
        <div className="about-recycle">
          <p className="about-eyebrow">재활용 유형(R코드) 예시</p>
          <ul>
            {recycleExamples.map(([e, t, n]) => (
              <li key={e}>
                <b>{e}</b>
                <span>{t}</span>
                <em className={n === '분석 없이 진행' ? 'is-free' : 'is-analysis'}>{n}</em>
              </li>
            ))}
          </ul>
          <small>
            목표 재활용 유형에 따라 사전 분석 요건이 달라집니다. 고형연료나 시멘트 보조연료로 가려면
            폐기물분석전문기관의 분석이 먼저입니다.
          </small>
        </div>
      </section>
      <section className="about-section" aria-labelledby="about-flow">
        <div className="about-heading">
          <p className="about-eyebrow">HOW IT WORKS</p>
          <h2 id="about-flow">SCRAP 이용 흐름</h2>
        </div>
        <ol className="about-flow">
          {usageFlow.map(([e, t], n) => (
            <li key={e}>
              <span>{n + 1}</span>
              <strong>{e}</strong>
              <p>{t}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="about-cta">
        <div>
          <h2>내 폐기물의 재활용 경로 찾기</h2>
          <p>질문 몇 개에 답하면 분류번호와 근거, 가능한 재활용 유형을 확인할 수 있어요.</p>
        </div>
        <a className="landing-button landing-button-primary" href="/login">
          시작하기
          <ArrowUpRightIcon />
        </a>
      </section>
      <p className="about-note">
        이 페이지는 이해를 돕기 위한 요약입니다. 실제 판단 기준은 폐기물관리법령과 관련 별표를
        따릅니다.
      </p>
      <SiteFooter />
    </main>
  );
}
