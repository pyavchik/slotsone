FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

ARG VITE_DEMO_JWT=""
ENV VITE_DEMO_JWT=${VITE_DEMO_JWT}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
