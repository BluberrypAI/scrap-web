import { useEffect, useRef } from 'react';
import { createThinkingOrb } from './thinking-orb.js';

const phases = {
  queued: ['검토 순서를 기다리고 있어요', '요청이 저장됐어요. 이 화면을 다시 열어도 진행 상황이 이어져요.'],
  candidate_search: ['맞는 공정과 업체를 찾고 있어요', '문진 결과와 현재 물량에 연결된 사업장을 확인해요.'],
  road_distance: ['가까운 업체부터 정렬하고 있어요', '우리 사업장부터 각 업체까지 카카오 자동차 도로거리를 확인해요.'],
  photo_observation: ['물량 사진을 확인하고 있어요', '사진에서 보이는 상태를 한 번 확인해 업체 검토에 함께 사용해요.'],
  facility_review: ['가까운 업체의 반입 근거를 대조하고 있어요', '근거가 부족하거나 제한이 있으면 다음 거리의 업체를 이어서 검토해요.'],
  photo_rejected: ['실제 물량 사진이 필요해요', '폐기물 상태를 확인할 수 있는 사진으로 바꿔 주세요.'],
  saving: ['검토 결과를 정리하고 있어요', '확인된 후보와 추가 확인이 필요한 업체를 나눠 저장해요.'],
};

export function reviewProgressText(progress = {}) {
  return phases[progress?.phase] || phases.queued;
}

export function reviewIsRunning(lot) {
  const job = lot?.review_progress;
  return ['queued', 'running'].includes(job?.status) && job.revision === lot.revision;
}

export function ReviewOrb({ progress }) {
  const [title, detail] = reviewProgressText(progress);
  const host = useRef(null);
  const orb = useRef(null);
  useEffect(() => {
    orb.current = createThinkingOrb(host.current);
    orb.current.show({ startedAt: progress?.started_at });
    return () => { orb.current?.dispose(); orb.current = null; };
  }, []);
  useEffect(() => { orb.current?.setCopy({ title, description: detail }); }, [title, detail]);
  return <div className="wf-thinking-wrapper" role="status" aria-live="polite" aria-atomic="true">
    <div ref={host} className="wf-thinking-animation" />
    {progress?.total > 0 && <div className="wf-thinking-counts">
      <span>검토 <b>{progress.completed || 0}</b>곳</span><i />
      <span>근거 확인 <b>{progress.selected || 0}</b> / {progress.target || 5}곳</span>
    </div>}
  </div>;
}
