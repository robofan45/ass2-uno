FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install dependencies
WORKDIR /app/apps/api
RUN pnpm install

# Copy source
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && pnpm dev"]
