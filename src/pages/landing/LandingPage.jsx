import { SiteHeader } from '../../components/SiteHeader.jsx';
import { MeadowBackground } from './ShowcaseHome.jsx';
import { GachonBadge } from './GachonBadge.jsx';
import './showcase.css';
import { AnimatedContent } from './LandingMotion.jsx';

const partners = [
  { id: 'moel', name: '고용노동부', image: '/images/partner-moel-symbol.svg' },
  { id: 'kiat', name: '한국산업기술진흥원', image: '/images/partner-kiat.jpg' },
  { id: 'kosa', name: '한국인공지능·소프트웨어산업협회', image: '/images/partner-kosa.png' },
  { id: 'microsoft', name: 'Microsoft', image: '/images/partner-microsoft.svg' },
  { id: 'gachon', name: '가천대학교', image: '/images/partner-gachon.png' },
];

export function LandingPage() {
  return (
    <main className="landing-page showcase-home" data-layer-name="Landing-Hero" data-theme="light">
      <SiteHeader />
      <section className="landing-hero meadow-integrated" aria-labelledby="landing-title">
        <MeadowBackground />
        <GachonBadge />
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
        </div>
        <footer className="meadow-credits">
          <svg className="partner-render-filters" aria-hidden="true" width="0" height="0">
            <defs>
              <filter id="partner-white-key" colorInterpolationFilters="sRGB">
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3" />
              </filter>
            </defs>
          </svg>
          <div className="meadow-credit-line">
            <p><strong>SCRAP</strong><span>팀 BluberrypAI</span><span>대표 윤재상</span></p>
            <nav aria-label="푸터 메뉴">
              <a href="#terms">이용약관</a>
              <a href="#privacy"><strong>개인정보처리방침</strong></a>
              <a href="https://github.com/BluberrypAI" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            </nav>
          </div>
          <p className="meadow-copyright">© 2026 BluberrypAI. All rights reserved.</p>
          <section className="landing-partners restored-partner-strip" aria-label="함께하는 파트너">
            <div className="landing-partner-window">
              <div className="landing-partner-track">
                {[0,1].map(copy => <div className="landing-partner-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                  {partners.map(({id,name,image}) => <div className={`landing-partner-logo landing-partner-${id}`} key={id}>
                    <span className="landing-partner-emblem"><img src={image} alt="" /></span>
                    <span className="landing-partner-name">{name}</span>
                  </div>)}
                </div>)}
              </div>
            </div>
          </section>
        </footer>
      </section>

    </main>
  );
}
