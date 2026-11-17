// 서버가 기록한 인계 이벤트를 로그인 기업 관점의 알림으로 변환한다.
const ACTIONS = {
  '인수 검토 요청': { title: '새 인수 요청', kind: 'request' },
  '인수 수락': { title: '인수 요청 수락', kind: 'accepted' },
  '인수 거절': { title: '인수 요청 거절', kind: 'rejected' },
  '조건부 수락 · 자료 확인 전 운송 보류': { title: '인수 조건 확인 필요', kind: 'conditional' },
  'QR 입고 확인': { title: '입고 확인 완료', kind: 'received' },
  '실제 산출물 기록': { title: '처리 결과 기록', kind: 'output' },
  '처리 완료 확인': { title: '처리 완료', kind: 'completed' },
};

export function workflowNotifications(lots, companyId) {
  if (!companyId) return [];
  return lots.flatMap((lot) => {
    const offers = lot.offers || [];
    const names = lot.companies || {};
    const events = lot.data?.events || [];
    const material = lot.data?.handoff?.waste_code || lot.data?.initial?.material?.toUpperCase() || '처리 건';
    let offerIndex = -1;
    return events.flatMap((event, index) => {
      if (event.action === '인수 검토 요청') offerIndex += 1;
      const offer = offers[offerIndex];
      const type = ACTIONS[event.action];
      if (!type || !offer || event.company_id === companyId) return [];
      const sender = names[offer.sender_id] || '발송 기업';
      const recipient = names[offer.recipient_id] || '수신 기업';
      const facility = offer.data?.facility?.label || recipient;
      let audience = [];
      let body = '';
      switch (event.action) {
        case '인수 검토 요청':
          audience = [offer.recipient_id, lot.owner_company_id];
          body = companyId === offer.recipient_id
            ? `${sender}에서 ${facility}로 인수를 요청했어요.`
            : `${sender}에서 ${recipient}에 다음 인수를 요청했어요.`;
          break;
        case '인수 수락':
        case '인수 거절':
        case '조건부 수락 · 자료 확인 전 운송 보류':
          audience = [offer.sender_id, lot.owner_company_id];
          body = `${recipient}에서 ${facility} 인수 요청에 응답했어요.`;
          break;
        case 'QR 입고 확인':
          audience = [offer.sender_id, lot.owner_company_id];
          body = `${recipient}에서 물량 입고를 확인했어요.`;
          break;
        case '실제 산출물 기록':
        case '처리 완료 확인':
          audience = [lot.owner_company_id, offer.sender_id];
          body = `${names[event.company_id] || '처리 기업'}에서 처리 결과를 기록했어요.`;
          break;
        default:
          return [];
      }
      if (!audience.includes(companyId)) return [];
      return [{
        id: `${lot.id}:${index}:${event.action}`,
        title: type.title,
        kind: type.kind,
        body,
        context: `${material} · ${facility}`,
        at: event.at,
        href: companyId === lot.owner_company_id && lot.diagnosis_id
          ? `/wastes/case-${lot.diagnosis_id}` : `/lots/${lot.id}`,
      }];
    });
  }).sort((a, b) => Date.parse(b.at || '') - Date.parse(a.at || '')).slice(0, 50);
}
