const MAILTO_LIMIT = 1800;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const INQUIRY_NUMBER = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 20 });
// 도로거리는 메일 본문과 같게 소수 한 자리로 보여 준다.
const DISTANCE_NUMBER = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const REPLY_LINK_PROMPT = '아래 링크에서 물량 정보를 확인하고 바로 답하실 수 있어요(로그인 불필요).';
export const REPLY_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.docx,.hwp,.hwpx';
export const REPLY_FILE_HELP = 'PDF, JPG, PNG, WebP, XLSX, DOCX, HWP, HWPX 중 파일 1개를 올릴 수 있어요. 최대 10MB예요.';
export function inquiryJoinError(status) {
  if (status === 404) return '링크가 만료됐거나 중지됐어요';
  if (status === 409) return '이 업체는 이미 서비스 계정이 연결돼 있어요. 그 계정으로 로그인해 주세요.';
  if (status === 429) return '지금은 참여 요청이 많아요. 잠시 후 다시 시도해 주세요.';
  return '링크로 참여하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export const AVAILABILITY_LABELS = {
  available: '가능',
  conditional: '조건부 가능',
  unavailable: '어려움',
};

export function replyLabels(reply) {
  return {
    source: reply.source === 'vendor_link' ? '링크로 답함' : null,
    availability: Object.hasOwn(AVAILABILITY_LABELS, reply.availability)
      ? AVAILABILITY_LABELS[reply.availability]
      : null,
  };
}

export function inquiryMailto(subject, text) {
  const subjectUrl = `mailto:?subject=${encodeURIComponent(subject)}`;
  const fullUrl = `${subjectUrl}&body=${encodeURIComponent(text.replace(/\r\n|\r|\n/g, '\r\n'))}`;
  const bodyOmitted = fullUrl.length > MAILTO_LIMIT;
  return { href: bodyOmitted ? subjectUrl : fullUrl, bodyOmitted };
}

export function inquiryGmailUrl(subject, body) {
  const params = new URLSearchParams({ view: 'cm', fs: '1', su: subject, body });
  return `https://mail.google.com/mail/?${params}`;
}

export function withReplyLink(text, replyUrl) {
  if (!replyUrl) return text;
  return `${text.trimEnd()}\n\n${REPLY_LINK_PROMPT}\n${replyUrl}`;
}

export function inquiryMailBody(packet, replyUrl) {
  return withReplyLink(packet?.mail_body || packet?.text || '', replyUrl);
}

export function inquirySummaryRows(summary) {
  if (!summary) return [];
  const distance = Number.isFinite(summary.road_distance_km)
    ? `도로 약 ${DISTANCE_NUMBER.format(summary.road_distance_km)} km`
    : '';
  const origin = summary.origin_region && distance
    ? `${summary.origin_region} (${distance})`
    : summary.origin_region || distance;
  return [
    ['품목', summary.item],
    ['중량', Number.isFinite(summary.weight_kg) ? `${INQUIRY_NUMBER.format(summary.weight_kg)} kg` : null],
    ['상태', summary.condition],
    ['분류번호(참고)', summary.waste_code],
    ['출발지', origin],
    ['희망 처리', summary.process],
  ].filter(([, value]) => value);
}

export function replyFileError(file) {
  if (!file?.name) return '';
  if (file.size === 0) return '내용이 있는 파일을 첨부해 주세요.';
  if (file.size > MAX_FILE_BYTES) return '첨부파일은 10MB 이하로 올려 주세요.';
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return REPLY_FILE_ACCEPT.split(',').includes(extension) ? '' : '첨부파일 형식을 확인해 주세요.';
}

export function optionalReplyFields(form, fields) {
  for (const field of fields) {
    const value = form.get(field)?.trim();
    if (value) form.set(field, value);
    else form.delete(field);
  }
  if (!form.get('file')?.name) form.delete('file');
  return form;
}

export function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
