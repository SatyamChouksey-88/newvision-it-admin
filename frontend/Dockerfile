# syntax=docker/dockerfile:1
# Dev-oriented image: runs the Vite dev server so local development has hot reload.
FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

EXPOSE 5173
# --host 0.0.0.0 so the dev server is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
