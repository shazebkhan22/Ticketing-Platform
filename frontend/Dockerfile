FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin deploy: Nginx proxies /api to the backend container, so the
# frontend only ever needs a relative base URL — no build-time secrets.
RUN echo "VITE_API_BASE_URL=/api" > .env.production
RUN npm run build

FROM nginx:1.29-alpine
# Pull whatever's newest in Alpine's package repo at build time, rather than
# trusting however old the base image's baked-in packages are — patched CVEs
# often land in the repo before the next official nginx image is published.
RUN apk update && apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
