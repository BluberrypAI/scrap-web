import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inquiryGmailUrl, inquiryJoinError, inquiryMailBody, inquiryMailto, inquirySummaryRows,
  optionalReplyFields, replyFileError, replyLabels,
} from './inquiry-replies.js';

test('참여 실패 이유에 맞춰 만료, 연결 계정, 요청 한도, 다시 시도 안내를 보여준다', () => {
  assert.equal(inquiryJoinError(404), '링크가 만료됐거나 중지됐어요');
  assert.equal(inquiryJoinError(409), '이 업체는 이미 서비스 계정이 연결돼 있어요. 그 계정으로 로그인해 주세요.');
  assert.equal(inquiryJoinError(429), '지금은 참여 요청이 많아요. 잠시 후 다시 시도해 주세요.');
  assert.equal(inquiryJoinError(500), '링크로 참여하지 못했어요. 잠시 후 다시 시도해 주세요.');
  assert.equal(inquiryJoinError(undefined), inquiryJoinError(500));
});

test('빈 받는 주소에 제목과 본문을 URL 인코딩하고 개행을 CRLF로 전달한다', () => {
  const { href, bodyOmitted } = inquiryMailto('반입 문의 & 견적 #1', '안녕하세요\n조건: 100%+\n주소: /#/reply/abc');
  assert.equal(bodyOmitted, false);
  assert.match(href, /^mailto:\?subject=/);
  assert.match(href, /%0D%0A/);
  const params = new URLSearchParams(href.split('?')[1]);
  assert.deepEqual([...params], [
    ['subject', '반입 문의 & 견적 #1'],
    ['body', '안녕하세요\r\n조건: 100%+\r\n주소: /#/reply/abc'],
  ]);
});

test('인코딩된 mailto 주소가 1800자를 넘을 때 제목만 남긴다', () => {
  const { href: prefix } = inquiryMailto('문의', '');
  const exact = inquiryMailto('문의', 'a'.repeat(1800 - prefix.length));
  assert.equal(exact.href.length, 1800);
  assert.equal(exact.bodyOmitted, false);
  assert.deepEqual(inquiryMailto('문의', '가'.repeat(250)), {
    href: `mailto:?subject=${encodeURIComponent('문의')}`,
    bodyOmitted: true,
  });
});

test('Gmail 작성 주소는 받는 사람을 비우고 제목과 본문, 링크의 특수 문자를 인코딩한다', () => {
  const subject = '반입 문의: PP & PE #1';
  const body = '안녕하세요\n100% + 견적\nhttps://scrap.example/#/reply/demo-token';
  const href = inquiryGmailUrl(subject, body);
  assert.match(href, /%26/);
  assert.match(href, /%0A/);
  assert.match(href, /%2B/);
  assert.match(href, /%23/);
  const url = new URL(href);
  assert.equal(`${url.origin}${url.pathname}`, 'https://mail.google.com/mail/');
  assert.equal(url.hash, '');
  assert.deepEqual(Object.fromEntries(url.searchParams), { view: 'cm', fs: '1', su: subject, body });
});

test('업체용 본문을 우선 사용하고 선택한 답장 링크만 안내 문장과 함께 붙인다', () => {
  const packet = { mail_body: '안녕하세요.\n반입 조건을 알려 주세요.\n', text: '상세 문의서' };
  const replyUrl = 'https://scrap.example/#/reply/demo-token';
  assert.equal(inquiryMailBody(packet, replyUrl),
    '안녕하세요.\n반입 조건을 알려 주세요.\n\n아래 링크에서 물량 정보를 확인하고 바로 답하실 수 있어요(로그인 불필요).\nhttps://scrap.example/#/reply/demo-token');
  assert.equal(inquiryMailBody(packet, null), packet.mail_body);
});

test('구버전 문의서 응답은 상세 본문으로 메일을 작성한다', () => {
  const packet = { text: '기존 문의서\n상세 본문' };
  const replyUrl = 'https://scrap.example/#/reply/demo-token';
  assert.equal(inquiryMailBody(packet), packet.text);
  assert.equal(inquiryMailBody(packet, replyUrl),
    '기존 문의서\n상세 본문\n\n아래 링크에서 물량 정보를 확인하고 바로 답하실 수 있어요(로그인 불필요).\nhttps://scrap.example/#/reply/demo-token');
});

test('공개 요약은 한글 라벨과 단위를 표시하고 빠진 선택 값을 생략한다', () => {
  assert.deepEqual(inquirySummaryRows({
    item: 'PP 조각', weight_kg: 1250.5, condition: '건조', waste_code: '51-03-01',
    origin_region: '경기도 성남시', road_distance_km: 12.25, process: '조각 → 펠렛',
  }), [
    ['품목', 'PP 조각'], ['중량', '1,250.5 kg'], ['상태', '건조'], ['분류번호(참고)', '51-03-01'],
    ['출발지', '경기도 성남시 (도로 약 12.3 km)'], ['희망 처리', '조각 → 펠렛'],
  ]);
  assert.deepEqual(inquirySummaryRows({
    item: 'PP 조각', weight_kg: 0, condition: null, waste_code: null,
    origin_region: '경기도 성남시', road_distance_km: null, process: null,
  }), [['품목', 'PP 조각'], ['중량', '0 kg'], ['출발지', '경기도 성남시']]);
  assert.deepEqual(inquirySummaryRows({ road_distance_km: 0 }), [['출발지', '도로 약 0.0 km']]);
  assert.deepEqual(inquirySummaryRows(null), []);
});

test('받은 답장 목록은 링크로 답한 출처와 가능 여부를 표시한다', () => {
  assert.deepEqual(replyLabels({ source: 'sender', availability: null }), { source: null, availability: null });
  assert.deepEqual(replyLabels({}), { source: null, availability: null });
  for (const [availability, label] of [['available', '가능'], ['conditional', '조건부 가능'], ['unavailable', '어려움']]) {
    assert.deepEqual(replyLabels({ source: 'vendor_link', availability }), { source: '링크로 답함', availability: label });
  }
});

test('답장 multipart는 빈 선택 입력을 빼고 파일 종류와 크기를 검사한다', () => {
  const form = new FormData();
  form.set('availability', 'conditional');
  form.set('text', ' 시험 답장 ');
  form.set('contact_name', ' ');
  form.set('file', new Blob(), '');
  assert.deepEqual([...optionalReplyFields(form, ['text', 'contact_name'])], [
    ['availability', 'conditional'], ['text', '시험 답장'],
  ]);
  assert.equal(replyFileError({ name: 'quote.PDF', size: 10 * 1024 * 1024 }), '');
  assert.match(replyFileError({ name: 'quote.pdf', size: 10 * 1024 * 1024 + 1 }), /10MB/);
  assert.match(replyFileError({ name: 'quote.exe', size: 1 }), /형식/);
});
