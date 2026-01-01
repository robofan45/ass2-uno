FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/prisma ./apps/api/prisma

# Install API dependencies first (for Prisma)
WORKDIR /app/apps/api
RUN pnpm install
RUN npx prisma generate

# Install worker dependencies
WORKDIR /app/apps/worker
RUN pnpm install

# Copy worker source
COPY apps/worker/src ./src
COPY apps/worker/tsconfig.json ./

CMD ["pnpm", "dev"]
