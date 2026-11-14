# SCRAP 웹

Re:Source AI의 **frontend** 레포. 화면, 3D 시각화, server API 호출을 담당함.

- 하지 않는 일: DB 직접 접근, ai 직접 호출 (항상 server API를 거침)
- 팀 공통 규칙: 조직 `.github` 레포의 [CONTRIBUTING.md](https://github.com/BluberrypAI/.github/blob/main/CONTRIBUTING.md)

## 브랜치

작업 브랜치 → `develop` (PR, CI 통과 후 작성자가 병합) → `main` (배포, 서버 담당자)

## 실행

```bash
npm ci
npm run dev -- --port 5178
```

## 현재 사용 흐름

1. 로그인한 기업으로 **질문으로 바로 시작** 또는 새 문진을 연다. 실제 문진 엔진을 호출하고 서버에 저장한다.
2. 분류를 확정하면 이미 확인한 재질·위치를 재입력하지 않는다. 필요한 현재 형태·중량·상태 설명·선택 사진을 추가한다.
3. 처리 건에서 **업체 검토 시작**을 누르면 다음 공정의 후보 전부를 AI가 검토한다. 현재 물량과 업체 공개 자료를 대조하며 최종 인수를 승인하지 않는다.
4. **이 업체의 반입 확인**에서 출처와 추가 질문을 확인한다. 답변을 저장하면 이전 AI 결과가 지워지고, 재검토 때 함께 전달된다.
5. B에게 인수를 요청한다. B는 수락·거절·조건부 수락을 선택한다. 조건부이면 A가 조건별 자료를 보내고 B가 모두 확인해야 QR을 발급할 수 있다.
6. B가 QR로 입고를 확인하고 실제 산출물을 기록한다. 이후에는 B가 그 산출물에 맞는 C 후보를 검토한다. 최종 산출물이라면 완료할 수 있다. 기록은 server DB에 저장되어 참여 기업이 공유한다.

PP 사출 잔재·파쇄품, PE 필름, 알루미늄임을 확인한 음료캔을 연결한다. PET병은 서버에서 공정 자료와 맞는 코드(51-03-07)를 확인한 경우만 등록하며, 현재 일반 PET 문진 결과(51-03-01)는 보류한다. 철·구리 등 다른 폐기물까지 전체 흐름을 지원하는 것은 아니다.

**전국 명부에서 더 찾기**는 현재 공정의 조사 대상을 페이지별로 보여준다. 소재가 명시된 자료를 먼저 보여주며, 넓은 분류·미확인 코드는 구분한다. 업체별 답변을 확인 목록에 저장할 수 있지만 공정 근거·수신계정이 없는 업체로 인수 요청을 보내지는 않는다. 전국 명부를 적재해야 실제 행이 보인다.

실제 업체 위치 지도는 Mapbox를 사용한다. 토큰이 없으면 OpenStreetMap 기반 지도를 표시하고, 좌표가 없는 기업의 위치·거리 순위를 만들지 않는다. 직선거리를 도로 거리나 운송비로 표시하지 않는다. `VITE_MAPBOX_ACCESS_TOKEN`은 공개용 토큰만 사용한다.

이전 정적 예시·브라우저 저장 추적 화면은 기존 데모다. 위 기업 간 인계는 `features/workflow/`와 `/api/v1/workflow`를 사용한다. 혼동하지 않는다.

## 이번 변경 검증

- 웹 테스트 38개와 production build 통과. 기존 3D·지도 대형 청크 경고는 남아 있다.
- 합성 기업 A→B 조건부 수락→자료 제출→최종 확인→QR→B 파쇄품 기록→C 후보 2개 Azure 검토→C QR→펠렛 기록→완료를 브라우저에서 수행했다.
- 답변 일부만 확인하면 수락할 수 없고, 조건부 상태에서는 QR이 없다. 처리 후에도 조건 확인 기록을 다시 볼 수 있다.
- 실제 기업의 허가·반입규격·현장 물량을 인증한 시험이 아니다.
- 적용 순서: `intake_answers`를 지원하는 scrap-ai → 새 조건·명부 API의 scrap-server → 이 웹 버전.

`npm test`와 `npm run build`로 확인한다.

## 서버 API 연동

회원·기업 API(`/api/v1`)는 로그인 쿠키(httpOnly) 때문에 **같은 출처**로만 호출합니다. 개발 중에는 Vite가 `/api/v1`을 서버(기본 `http://127.0.0.1:8000`)로 넘기고, 운영에서는 nginx가 넘깁니다. 서버 주소를 바꾸려면 `.env`에 `SCRAP_SERVER_URL`을 둡니다.

1. server 레포를 8000 포트로 실행합니다 (server `backend/README.md`의 "프론트엔드와 함께 실행").
2. `npm run dev`로 실행하고 **`http://localhost:5173`**을 엽니다. 소셜 로그인 콜백이 `localhost:8000`으로 오므로 `127.0.0.1`로 열면 로그인 쿠키가 보이지 않습니다.
3. OAuth 키가 없으면 로그인 화면의 "개발용 로그인" 버튼(dev 모드에서만 보임)을 씁니다.

| 파일 | 역할 |
| --- | --- |
| [src/lib/api.js](src/lib/api.js) | API 호출. 401이면 토큰을 한 번 재발급하고 다시 보냄. 오류는 서버 형식(`code`, `message`, `details`)의 `ApiError`로 던짐 |
| [src/lib/session.js](src/lib/session.js) | 로그인 상태 판단 (`signed-out`, `onboarding`, `ready`)과 이동할 화면 결정 |
| [src/hooks/useSession.js](src/hooks/useSession.js) | 화면에서 로그인 상태를 쓰는 훅. `useRequireSession`은 상태에 맞지 않는 화면이면 로그인·온보딩·앱 화면으로 보냄 |
| [src/lib/auth.js](src/lib/auth.js) | 헤더 버튼처럼 서버 응답 전에 그려야 하는 곳에서 쓰는 로그인 힌트(localStorage). 기준은 항상 `/users/me` |

서버는 로그인 뒤 `/onboarding`, `/login?error=...` 같은 일반 경로로 보냅니다. [src/lib/router.js](src/lib/router.js)가 이를 해시 주소(`/#/onboarding`)로 바꿉니다.

## Docker

빌드한 정적 파일을 nginx로 서빙합니다. `/api/` 요청은 `SCRAP_SERVER_URL`(기본값 `http://host.docker.internal:8000`)로 그대로 전달합니다.

```bash
docker build -t scrap-web .
docker run --rm -p 8080:80 -e SCRAP_SERVER_URL=http://host.docker.internal:8000 scrap-web
```

`http://localhost:8080`에서 확인합니다. 서버를 같은 Docker 네트워크에서 실행한다면 `SCRAP_SERVER_URL`을 서버 컨테이너 주소(예: `http://backend:8000`)로 바꿉니다.

## 구조

Vite + React 19 프로젝트입니다. 라우팅은 해시(`#/경로`) 기반이며 [src/lib/router.js](src/lib/router.js)에 있습니다.

```
index.html              # <div id="root"> + src/main.jsx
public/                 # 그대로 서빙되는 정적 파일 (이미지, 파비콘)
src/
├─ main.jsx             # 진입점: 라우팅 설치, 전역 CSS, 렌더링
├─ App.jsx              # 최상위 경로 분기 (/, /about, /login, /onboarding, 앱 화면)
├─ layouts/AppShell.jsx # 상단 내비게이션이 있는 앱 화면과 작업(L3) 화면 분기
├─ pages/               # 화면 단위 컴포넌트 (landing, about, auth, wastes, waste-detail, survey, map, data, report …)
├─ components/          # 여러 화면에서 쓰는 컴포넌트 (Icon, SiteFooter, AppTopNav, WorkBar …)
├─ hooks/               # 공용 훅 (useSession: 로그인 상태)
├─ lib/                 # 라우팅(router.js), 서버 API 호출(api.js), 로그인 상태 판단(session.js)
├─ data/                # 시연용 정적 데이터 (폐기물, 업체, 메뉴)
├─ features/workflow/   # 기업 계정·후보별 질문·조건부 수락·QR·산출물 (server DB)
├─ features/treatment/  # 처리경로 추적 기능 (상태·증빙 로직, 3D 모식도, 테스트)
├─ assets/              # import해서 쓰는 이미지
└─ styles/global.css    # 전역 스타일
```

화면 문구나 레이아웃은 `src/pages/` 아래 해당 화면 파일을 고치면 됩니다. 스타일은 `src/styles/global.css`의 클래스명을 그대로 사용합니다.
