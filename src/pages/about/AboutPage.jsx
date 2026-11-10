import berryAvatar from '../../assets/berry.png';
import { ArrowUpRightIcon } from '../../components/LandingIcons.jsx';
import BorderGlow from '../../components/reactbits/BorderGlow/BorderGlow.jsx';
import MicroSlats from '../../components/reactbits/MicroSlats/MicroSlats.jsx';
import { SiteFooter } from '../../components/SiteFooter.jsx';
import { SiteHeader } from '../../components/SiteHeader.jsx';
import { getStartPath } from '../../lib/auth.js';
import { useInView } from '../../hooks/useInView.js';
import {
  aboutWhy,
  berryRoles,
  handlingSteps,
  recycleExamples,
  usageFlow,
  wasteCategories,
} from './aboutContent.js';

export function AboutPage() {
  const [whyRef, whyInView] = useInView();
  return (
    <main className="landing-page about-page" data-layer-name="About-Company" data-theme="light">
      <SiteHeader activeHref="/about" />
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
        <div className="about-grid about-grid-3" ref={whyRef}>
          {aboutWhy.map(([num, title, text], index) => (
            <div
              className={`reveal-up${whyInView ? ' is-visible' : ''}`}
              style={{ '--reveal-delay': `${index * 120}ms` }}
              key={num}
            >
              <BorderGlow
                className="about-glow-card"
                backgroundColor="#ffffff"
                borderRadius={8}
                glowRadius={32}
                glowColor="258 70 60"
                glowIntensity={1.25}
                fillOpacity={0.22}
                colors={['#7053b7', '#b79cf0', '#a3e75e']}
              >
                <article className="about-card">
                  <span className="about-num">{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              </BorderGlow>
            </div>
          ))}
        </div>
      </section>
      <section className="about-section" aria-labelledby="about-class">
        <div className="about-heading">
          <p className="about-eyebrow">BASICS 01</p>
          <h2 id="about-class">폐기물은 이렇게 나뉩니다</h2>
          <p>법령상 폐기물은 배출 주체와 위험성에 따라 구분됩니다.</p>
        </div>
        <div className="about-table-wrap">
          <table className="about-table">
            <thead>
              <tr>
                <th scope="col">분류</th>
                <th scope="col">배출 주체</th>
                <th scope="col">위험성</th>
                <th scope="col">설명</th>
                <th scope="col">예시</th>
              </tr>
            </thead>
            <tbody>
              {wasteCategories.map((category) => (
                <tr key={category.name}>
                  <th scope="row">
                    <span className="about-table-tag">{category.name}</span>
                  </th>
                  <td data-label="배출 주체">{category.source}</td>
                  <td data-label="위험성">{category.hazard}</td>
                  <td data-label="설명">{category.desc}</td>
                  <td className="about-table-example" data-label="예시">
                    {category.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              같은 합성수지도 형태 혹은 배출 주체에 따라 사업장일반폐기물이 될 수 있고
              지정폐기물이 될 수 있습니다.
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
      <section className="about-section" aria-labelledby="about-berry">
        <div className="about-berry">
          <div className="about-berry-bg" aria-hidden="true">
            <MicroSlats preset="tide" color="#7053b7" glintColor="#ffffff" backgroundColor="transparent" />
          </div>
          <img className="about-berry-avatar" src={berryAvatar} alt="에이전트 베리" />
          <div>
            <p className="about-eyebrow">MEET BERRY</p>
            <h2 id="about-berry">문진을 함께하는 에이전트, 베리</h2>
            <p className="about-berry-lead">
              베리는 SCRAP의 문진 에이전트예요. 어떤 폐기물인지 편하게 설명하면 내용을 읽고 정리한
              뒤, 분류에 꼭 필요한 질문만 골라 물어봐요.
            </p>
            <ul className="about-berry-roles">
              {berryRoles.map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
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
          <h2>우리 사업장의 자원 경로 찾기</h2>
          <p>질문 몇 개에 답하면 분류번호와 근거, 가능한 재활용 유형을 확인할 수 있어요.</p>
        </div>
        <a className="landing-button landing-button-primary" href={getStartPath()}>
          시작하기
          <ArrowUpRightIcon />
        </a>
      </section>
      <p className="about-note">SCRAP의 네비게이터는 폐기물관리법령과 관련 별표를 따릅니다.</p>
      <SiteFooter />
    </main>
  );
}
