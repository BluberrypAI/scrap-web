export function LandingArtwork() {
  return (
    <div
      className="landing-artwork"
      data-layer-name="3D-Placeholder"
      aria-label="순환 자원을 표현한 3D 오브젝트"
    >
      <div className="landing-core" aria-hidden="true">
        <span className="landing-core-disc" />
        <span className="landing-ring landing-ring-back" />
        <span className="landing-cube">
          <i className="landing-cube-front">S</i>
          <i className="landing-cube-side" />
          <i className="landing-cube-top" />
        </span>
        <span className="landing-ring landing-ring-front" />
      </div>
      <span className="landing-lime-dot landing-lime-dot-one" aria-hidden="true" />
      <span className="landing-lime-dot landing-lime-dot-two" aria-hidden="true" />
      <div className="landing-chip landing-chip-one">
        <span className="landing-chip-icon">01</span>
        <span>
          <small>분석 대상</small>
          <strong>폐수 슬러지</strong>
        </span>
      </div>
      <div className="landing-chip landing-chip-two">
        <span className="landing-chip-dot" />
        <span>
          <small>순환 자원</small>
          <strong>폐유</strong>
        </span>
      </div>
      <div className="landing-chip landing-chip-three">
        <span>
          <small>재활용률</small>
          <strong className="landing-chip-value">92%</strong>
        </span>
      </div>
      <div className="landing-chip landing-chip-four">
        <span className="landing-chip-status" />
        <span>
          <small>AI 매칭 완료</small>
          <strong>처리업체 8곳</strong>
        </span>
      </div>
    </div>
  );
}
