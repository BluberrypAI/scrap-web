import berry from '../../assets/berry.png';
import BerrySpeech from '../diagnosis/components/BerrySpeech.jsx';

/** 문진 확정 뒤 처리 경로·업체 연결을 준비하는 동안 보여 주는 베리 안내. */
export function BerryRouteStatus({ text, compact = false }) {
  return (
    <section
      className={`berry-route-status${compact ? ' is-compact' : ''}`}
      aria-label="처리 경로 준비 상태"
      aria-busy="true"
    >
      <BerrySpeech text={text} mode="thinking" />
      <div className="berry-route-figure" aria-hidden="true">
        <img src={berry} alt="" />
      </div>
    </section>
  );
}
