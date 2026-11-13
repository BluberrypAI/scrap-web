# 1단계: 정적 파일 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite는 빌드할 때 VITE_* 값을 코드에 넣는다 (.env는 이미지에 복사하지 않음)
ARG VITE_MAPBOX_ACCESS_TOKEN=
# 로그인 화면에 개발용 로그인 버튼 표시. 로컬 통합 실행용, 배포 빌드는 false
ARG VITE_ENABLE_DEV_LOGIN=false
ENV VITE_MAPBOX_ACCESS_TOKEN=$VITE_MAPBOX_ACCESS_TOKEN     VITE_ENABLE_DEV_LOGIN=$VITE_ENABLE_DEV_LOGIN
RUN npm run build

# 2단계: nginx로 정적 파일 서빙 + /api 요청을 서버로 전달
FROM nginx:1.27-alpine
# 컨테이너 실행 시 -e SCRAP_SERVER_URL=... 로 바꿀 수 있음
ENV SCRAP_SERVER_URL=http://host.docker.internal:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
