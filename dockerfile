# Build stage
FROM node:18.19-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist/quiz-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200


CMD ["/bin/sh", "-c", "nginx -g 'daemon off;'"]