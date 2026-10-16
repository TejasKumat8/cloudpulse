# Stage 1: Build React static assets
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Nginx runtime (unprivileged non-root user)
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Non-root user 101 is default in nginx-unprivileged
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
