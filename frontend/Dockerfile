FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Статика
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Гарантируем runtime-config из public (перезатирает dist/config.json, если он сгенерен старым)
COPY --from=build /app/public/config.json /usr/share/nginx/html/config.json

EXPOSE 80
