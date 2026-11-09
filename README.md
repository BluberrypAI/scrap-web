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

로컬에서는 같은 워크스페이스에 `scrap-ai`를 두고 처리경로 엔진을 8017에서 실행합니다. Vite 개발 서버가 `/api/treatment/next-step`을 로컬 엔진으로 전달합니다. 실제 서버를 함께 실행할 때는 개발 서버 환경에 `SCRAP_SERVER_URL`을 설정하고, 서버가 해당 경로를 제공하도록 연결합니다. 운영에서는 동일 출처 서버 API가 필요합니다.

1. `/#/wastes`에서 **PP 사출 잔재 예시** 또는 **알루미늄 캔 예시**를 열거나 새 문진을 시작합니다.
2. 새 문진은 분류 확정 전에 재질·형태를 기록합니다. 처리경로를 열면 저장된 분류와 배출 공장 위치를 사용합니다. 데모는 기업 데이터에 표시된 화성시 팔탄면의 행정복지센터를 거리 계산 기준점으로 사용합니다.
3. 첫 탭인 **처리경로**에서 다음 공정의 작업·업체를 확인합니다. 배출 공장 위치와 업체 좌표가 있으면 직선거리순 최대 5곳을 3D 모식도에 표시합니다. 배출 공장 위치가 없는 건도 후보 목록을 확인할 수 있습니다.
4. 업체를 예정 경로에 기록합니다. 명부에서 찾은 업체는 담당자가 공정·허가·인수 조건을 확인하고 증빙 식별자를 입력합니다.
5. **배출·운반 인계 → 업체 입고 → 처리·산출물** 순으로 실제 증빙 식별자와 중량을 기록합니다. 누락이나 로트·중량·사업장·공정 불일치가 있으면 확인을 요청하고 다음 공정을 보류합니다.
6. **기록** 탭에서 로트별 증빙 보고서를 확인하고 JSON으로 내려받습니다.

원본 팀 HTML 내 문진은 폐합성수지 예시이며, 알루미늄 캔은 목록에 분류가 주어진 시연 건으로 포함했습니다. 추적 상태는 브라우저 저장소에 남습니다. 화면의 3D 초원·공장 모델은 기존 Re:Source World 시연에서 사용한 절차적 모델입니다.

공정별 **명부 검색**은 별도 목록에서 조사 단서를 보여줍니다. 로컬 Vite는 `/api/treatment/facility-candidates`를 AI의 `/kg/facility-candidates`로 전달합니다. 명부 적재와 운영 서버 프록시 설정이 필요합니다. 명부 좌표로 계산한 거리는 참고용이며, 명부 단서는 기존 공정 근거 후보 및 지도 순위와 분리합니다.

이 시연은 한 로트가 한 경로를 순서대로 이동하는 경우를 다룹니다. 증빙은 담당자가 참조 번호를 기록하며, 브라우저에 정정 이력과 함께 저장됩니다. 대조는 입력값의 일관성을 확인합니다. 실제 증빙 원본 보관, 업체 서명, 올바로 연계와 기관 심사는 운영 단계에 해당합니다. 시연은 가상 증빙을 사용합니다.

`npm test`와 `npm run build`로 확인할 수 있습니다.

## 서버 API 연동

회원·기업 API(`/api/v1`)는 로그인 쿠키(httpOnly) 때문에 **같은 출처**로만 호출합니다. 개발 중에는 Vite가 `/api/v1`을 서버(기본 `http://127.0.0.1:8000`)로 넘기고, 운영에서는 nginx가 넘깁니다. 서버 주소를 바꾸려면 `.env`에 `SCRAP_SERVER_URL`을 둡니다.

1. server 레포를 8000 포트로 실행합니다 (server `backend/README.md`의 "프론트엔드와 함께 실행").
2. `npm run dev`로 실행하고 `http://127.0.0.1:5173`을 엽니다. `localhost`와 섞어 쓰면 쿠키가 따로 저장되니 한쪽으로 맞춥니다.
3. OAuth 키가 없으면 개발용 로그인(`POST /api/v1/auth/dev-login`)을 씁니다.

| 파일 | 역할 |
| --- | --- |
| [src/lib/api.js](src/lib/api.js) | API 호출. 401이면 토큰을 한 번 재발급하고 다시 보냄. 오류는 서버 형식(`code`, `message`, `details`)의 `ApiError`로 던짐 |
| [src/lib/session.js](src/lib/session.js) | 로그인 상태 판단 (`signed-out`, `onboarding`, `ready`)과 이동할 화면 결정 |
| [src/hooks/useSession.js](src/hooks/useSession.js) | 화면에서 로그인 상태를 쓰는 훅 |

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
├─ features/treatment/  # 처리경로 추적 기능 (상태·증빙 로직, 3D 모식도, 테스트)
├─ assets/              # import해서 쓰는 이미지
└─ styles/global.css    # 전역 스타일
```

화면 문구나 레이아웃은 `src/pages/` 아래 해당 화면 파일을 고치면 됩니다. 스타일은 `src/styles/global.css`의 클래스명을 그대로 사용합니다.
