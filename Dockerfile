# 1단계: 정적 파일 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: nginx로 정적 파일 서빙 + /api 요청을 서버로 전달
FROM nginx:1.27-alpine
# 컨테이너 실행 시 -e SCRAP_SERVER_URL=... 로 바꿀 수 있음
ENV SCRAP_SERVER_URL=http://host.docker.internal:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
