# STEP 9 — Dockerfile untuk Next.js (standalone output)
FROM node:20-alpine AS base
# Prisma butuh OpenSSL untuk memuat query engine-nya. Tanpa ini, image alpine
# memunculkan peringatan "failed to detect the libssl/openssl version" dan
# koneksi database bisa gagal saat runtime.
RUN apk add --no-cache openssl libc6-compat

# --- deps ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# --- build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL dummy hanya untuk prisma generate saat build.
# Rahasia sungguhan TIDAK boleh masuk ke sini — .dockerignore menahan .env agar
# tidak ikut terkirim, karena Next menyalin .env ke dalam output standalone.
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate && npm run build

# --- runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Konfigurasi diberikan saat runtime lewat environment variable / --env-file,
# bukan dipanggang ke dalam image.
CMD ["node", "server.js"]
