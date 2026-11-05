import { ArrowUpRightIcon, PlayIcon } from '../../components/LandingIcons.jsx';
import { SiteFooter } from '../../components/SiteFooter.jsx';
import { SiteHeader } from '../../components/SiteHeader.jsx';
import { LandingArtwork } from './LandingArtwork.jsx';

const partners = [
  ['ER', 'ECOROUND'],
  ['CL', 'CIRCULAR LAB'],
  ['RS', 'RE:SOURCE'],
  ['GF', 'GREENFLOW'],
  ['ML', 'MATERIAL LOOP'],
  ['ZW', 'ZERO WASTE'],
];

export function LandingPage() {
  return (
    <main className="landing-page" data-layer-name="Landing-Hero" data-theme="light">
      <SiteHeader />
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <div className="landing-eyebrow">
            <span />
            산업폐기물 순환 AI 에이전트
          </div>
          <h1 id="landing-title">
            Connecting Resources,
            <br />
            <span>Creating Circulation.</span>
          </h1>
          <p>
            폐기물 분류부터 처리업체에 맡기는 시간까지,
            <br />
            SCRAP이 더 빠르고 투명한 자원순환을 시작합니다.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary landing-button-large" href="/login">
              시작하기
              <ArrowUpRightIcon />
            </a>
            <button
              className="landing-button landing-button-secondary landing-button-large"
              type="button"
            >
              <span className="landing-play">
                <PlayIcon />
              </span>
              데모 보기
            </button>
          </div>
        </div>
        <div className="landing-visual">
          <LandingArtwork />
        </div>
      </section>
      <section className="landing-partners" aria-label="함께하는 파트너">
        <p>순환 경제를 함께 만드는 파트너</p>
        <div>
          {partners.map(([e, t]) => (
            <span className="landing-partner-logo" key={t}>
              <i>{e}</i>
              <strong>{t}</strong>
            </span>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
