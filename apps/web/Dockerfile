FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
WORKDIR /app/apps/web
RUN pnpm install

# Copy source
COPY apps/web/src ./src
COPY apps/web/index.html ./
COPY apps/web/vite.config.ts ./
COPY apps/web/tsconfig.json ./

EXPOSE 5173

CMD ["pnpm", "dev"]
