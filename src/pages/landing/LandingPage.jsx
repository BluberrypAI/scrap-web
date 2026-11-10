import { ArrowUpRightIcon, PlayIcon } from '../../components/LandingIcons.jsx';
import { SiteFooter } from '../../components/SiteFooter.jsx';
import { SiteHeader } from '../../components/SiteHeader.jsx';
import { LandingArtwork } from './LandingArtwork.jsx';
import { AnimatedContent, MagnetLink } from './LandingMotion.jsx';
import { getStartPath } from '../../lib/auth.js';

const partners = [
  { id: 'moel', name: '고용노동부', image: '/images/partner-moel.svg' },
  { id: 'kiat', name: '한국산업기술진흥원', image: '/images/partner-kiat.jpg' },
  { id: 'kosa', name: '한국인공지능·소프트웨어산업협회', image: '/images/partner-kosa.png' },
  { id: 'microsoft', name: 'Microsoft', image: '/images/partner-microsoft.svg' },
  { id: 'gachon', name: '가천대학교', image: '/images/partner-gachon.png' },
];

function PartnerLogos() {
  return partners.map(({ id, name, image }) => (
    <div className={`landing-partner-logo landing-partner-${id}`} key={id}>
      <span className="landing-partner-emblem" aria-hidden="true">
        <img src={image} alt="" loading="lazy" />
      </span>
      <span className="landing-partner-name">{name}</span>
    </div>
  ));
}

export function LandingPage() {
  return (
    <main className="landing-page" data-layer-name="Landing-Hero" data-theme="light">
      <SiteHeader />
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <h1 id="landing-title">
            Connecting Resources,
            <br />
            <span className="landing-headline-accent">Creating Circulation.</span>
          </h1>
          <AnimatedContent as="p" delay={180}>
            폐기물 분류부터 처리업체에 맡기는 시간까지,
            <br />
            SCRAP이 더 빠르고 투명한 자원순환을 시작합니다.
          </AnimatedContent>
          <AnimatedContent className="landing-actions" delay={380}>
            <MagnetLink className="landing-button landing-button-primary landing-button-large" href={getStartPath()}>
              시작하기
              <ArrowUpRightIcon />
            </MagnetLink>
            <button
              className="landing-button landing-button-secondary landing-button-large"
              type="button"
            >
              <span className="landing-play">
                <PlayIcon />
              </span>
              데모 보기
            </button>
          </AnimatedContent>
        </div>
        <AnimatedContent className="landing-visual" delay={580}>
          <LandingArtwork />
        </AnimatedContent>
      </section>
      <SiteFooter />
      <section className="landing-partners" aria-label="함께하는 파트너">
        <div className="landing-partner-window">
          <div className="landing-partner-track">
            <div className="landing-partner-group"><PartnerLogos /></div>
            <div className="landing-partner-group" aria-hidden="true"><PartnerLogos /></div>
          </div>
        </div>
      </section>
    </main>
  );
}
