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

Vite는 기본으로 `http://127.0.0.1:8000`의 `scrap-server`로 요청을 전달합니다. 포트가 다르면 `SCRAP_SERVER_URL`을 지정하세요. 공정과 명부 적재, 문진 엔진 연결은 [서버 README](https://github.com/BluberrypAI/scrap-server/blob/develop/backend/README.md)를 참고하세요.

1. `/#/wastes`에서 **PP 사출 잔재 예시** 또는 **알루미늄 캔 예시**를 열거나 새 문진을 시작합니다.
2. 새 문진은 서버를 통해 `resource_engine`에서 질문과 결과를 받습니다. 분류번호와 재질을 확인한 뒤 현재 형태를 선택하면 처리경로를 엽니다. 데모 출발지는 화성시 팔탄면 행정복지센터 기준점입니다.
3. 첫 탭인 **처리경로**에서 다음 공정의 작업·업체를 확인합니다. 배출 공장 위치와 업체 좌표가 있으면 직선거리순 최대 5곳을 3D 모식도에 표시합니다. 배출 공장 위치가 없는 건도 후보 목록을 확인할 수 있습니다.
4. A는 예상 공정 순서를 보고 다음 인계 업체 B만 선택합니다. 명부에서 찾은 업체는 담당자가 공정·허가·인수 조건을 확인하고 증빙 식별자를 입력합니다.
5. 운송 탭의 수령 결과를 받으면 맵과 폐기물 카드에 반영합니다. **처리업체 화면 시연**을 열면 A와 같은 초기 공정 흐름을 보면서 실제 산출물 상태·중량·순도를 기록할 수 있습니다.
6. `scrap-server`가 산출물 상태와 B의 위치로 바로 다음 공정과 업체를 찾습니다. B가 다음 업체를 고르면 A 화면에 인계 구간이 추가됩니다. **기록** 탭에서는 추적 기록을 JSON으로 내려받을 수 있습니다.

공정 추적을 지원하는 소재는 PP·PE·PET·알루미늄입니다. 인계된 카드와 공정 진행은 참여 기업이 서버에서 공유합니다. 예정 산출물과 다르면 담당자가 증빙을 확인하고 자료 번호를 기록할 때까지 다음 후보와 추적 종료를 보류합니다.

**명부 검색**은 공정 또는 분류번호와 맞는 업체 단서를 보여줍니다. 검수된 공정이 없는 분류번호도 문진 결과에서 조회할 수 있습니다. 명부 좌표의 직선거리는 참고값이며, 공정 근거와 실제 인수 가능 여부는 업체에 확인합니다.

### 운송 탭과 사업장 권한

각 폐기물 카드의 **운송** 탭에서 현재 인계 구간 QR을 열 수 있습니다. QR에는 카드 ID(`wasteId`)와 인계 구간 ID(`legId`)가 연결됩니다. 현장 화면에서 기사 인수와 업체 입고를 별도로 기록하며, 업체 입고가 기록되면 처리경로에 수령 체크가 표시됩니다. 같은 물리 사업장의 후속 작업은 내부 공정으로 이어지며 새 인계 구간을 만들지 않습니다.

기사 인수와 업체 입고는 `scrap-server`의 `/api/v1/transport`를 통해 PostgreSQL에 저장합니다. QR은 다른 브라우저에서 열 수 있고, 기존 처리경로는 입고 기록을 조회해 체크를 갱신합니다. 로컬 서버 기본 포트는 8000이며, Vite 개발 환경에서만 `SCRAP_TRANSPORT_DEV_LOGIN=1`로 개발 로그인을 사용할 수 있습니다. 실제 휴대폰에서 열려면 QR의 주소에 접속할 수 있는 환경이 필요합니다.

`npm test`와 `npm run build`로 확인할 수 있습니다.

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
├─ hooks/               # 공용 훅
├─ data/                # 시연용 정적 데이터 (폐기물, 업체, 메뉴)
├─ features/treatment/  # 처리경로 추적 기능 (상태·증빙 로직, 3D 모식도, 테스트)
├─ assets/              # import해서 쓰는 이미지
└─ styles/global.css    # 전역 스타일
```

화면 문구나 레이아웃은 `src/pages/` 아래 해당 화면 파일을 고치면 됩니다. 스타일은 `src/styles/global.css`의 클래스명을 그대로 사용합니다.
