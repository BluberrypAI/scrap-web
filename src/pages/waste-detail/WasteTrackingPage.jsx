import * as React from 'react';
import { createWasteTracking } from '../../waste-tracking.jsx';

const { CompanyPanel } = createWasteTracking(React);

export function WasteTrackingPage({ waste }) {
  return <main className="waste-detail wt-company-page">
    <a className="detail-back" href={`/wastes/${waste.id}?tab=route`}>← 내 폐기물로 돌아가기</a>
    <header className="detail-header">
      <div>
        <span>내 폐기물 · 현장 확인</span>
        <h1>{waste.name}</h1>
        <div className="detail-code"><strong>분류번호 {waste.code || '미확정'}</strong></div>
      </div>
    </header>
    <CompanyPanel waste={waste} />
  </main>;
}
