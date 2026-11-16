export const TOTAL_CANDIDATES = 26;

export const surveySteps = [
  {
    start: 26,
    remaining: 17,
    title: '폐기물의 주된 물질은 무엇입니까?',
    helper: '별표 4가 물질 계열로 먼저 나눕니다',
    options: [
      {
        label: '합성수지 · 플라스틱',
        hint: 'PE, PP, PVC, PET, ABS, 우레탄, 스티로폼',
        demo: true,
      },
      {
        label: '합성고무',
      },
      {
        label: '목재',
        hint: '가구, 포장재, 톱밥, 임목, 침목',
      },
      {
        label: '그 외',
        hint: '금속, 오니, 폐유, 폐산, 유리, 분진',
      },
    ],
  },
  {
    start: 17,
    remaining: 8,
    title: '그 폐합성수지는 고체상태입니까?',
    law: true,
    note: '질문 하나로 9개 후보가 한 번에 제외됐어요',
    options: [
      {
        label: '고체',
        hint: '성형 불량품, 스프루·런너, 분쇄 플레이크',
        demo: true,
      },
      {
        label: '액상 또는 반고상',
        hint: '미경화 수지액, 슬러지 형태',
      },
    ],
  },
  {
    start: 8,
    remaining: 1,
    title: '그 폐합성수지의 형태에 가장 가까운 것은?',
    options: [
      {
        label: '일반 합성수지류',
        hint: '염화비닐수지(PVC)가 아닌 것',
        demo: true,
      },
      {
        label: '폴리염화비닐수지류 (PVC)',
      },
      {
        label: '폴리우레탄폼류',
      },
      {
        label: '발포합성수지',
        hint: '스티로폼 등',
      },
      {
        label: '플라스틱 포장재',
      },
      {
        label: '어망',
      },
      {
        label: '양식용 부자',
      },
      {
        label: '합성수지로 피복된 폐전선',
      },
    ],
  },
];

export const evidenceItems = [
  {
    num: '01',
    title: '합성수지·플라스틱',
    cite: '별표 4 중분류 51-03 폐합성고분자화합물',
    quote: '폐합성고분자화합물',
    outcome: '',
    reason: '문진 1단계에서 합성수지·플라스틱을 선택했어요.',
  },
  {
    num: '02',
    title: '고체상태',
    cite: '영 별표 1 제1호 가목',
    quote: '폐합성 수지(고체상태의 것은 제외한다)',
    outcome: '지정폐기물 아님',
    reason: '문진 2단계에서 고체를 선택했어요.',
  },
  {
    num: '03',
    title: '염화비닐수지 아님',
    cite: '별표 4',
    quote: '폐염화비닐수지류는 제외한다',
    outcome: '51-03-01 확정',
    reason: '문진 3단계에서 일반 합성수지류를 선택했어요.',
  },
];

export const freeRecycleTypes = [
  ['R-1', '원형 그대로 재사용'],
  ['R-2', '단순 수리·수선, 세척하여 재사용'],
  ['R-3-2', '용융·용해·반응·추출로 자원 회수'],
  ['R-3-3', '파쇄·선별·용융 등으로 합성수지 원료물질 제조'],
  ['R-3-4', '위 외의 원료물질 제조'],
  ['R-4-4', '고무·섬유·플라스틱 제품 제조'],
  ['R-9-3', '열분해·탄화로 연료 제조'],
  ['R-10', '중간가공폐기물 제조'],
];

export const analysisRecycleTypes = [
  ['R-8-1', '시멘트소성로 보조연료'],
  ['R-8-2', '소각열회수시설 에너지 회수'],
  ['R-9-1', '고형연료제품 제조'],
  ['R-10', '중간가공폐기물 제조'],
];

export const LAW_BASE_DATE = '2026. 10. 30';

export const judgingSteps = [
  {
    voice: 'ai',
    text: '답변을 모아서 읽고 있어요',
  },
  {
    voice: 'ai',
    text: '답변이 서로 맞는지 살펴보고 있어요',
  },
  {
    voice: 'system',
    text: '법조문을 조회하고 있습니다',
  },
  {
    voice: 'system',
    text: '분류번호를 판정하고 있습니다',
  },
  {
    voice: 'system',
    text: '허용 재활용 유형을 조회하고 있습니다',
  },
];

export const intakeExamples = [
  '사출 공장 3번 라인에서 나오는 성형 불량품과 스프루, 런너를 월 2.3톤 정도 버려요',
  '제품 만들고 남은 플라스틱 조각이 있는데 어떻게 분류해야 하나요?',
];

export const intakeCues = [
  ['배출 공정', '사출 성형 · 3번 라인'],
  ['폐기물', '성형 불량품, 스프루·런너'],
  ['물질 추정', '합성수지 · 플라스틱'],
  ['배출량', '월 2.3톤'],
];
