# Lucky Store Customer Storefront — Next.js 15 Production Dockerfile
# Multi-stage: build → runner (standalone output)

# =================== Stage 1: Builder ===================
FROM node:24-alpine AS builder
WORKDIR /app

# Copy root package files for monorepo context
COPY package*.json ./
COPY apps/customer_storefront/package*.json ./apps/customer_storefront/

# Install deps (monorepo hoisted + app-specific)
RUN npm ci --workspace=customer_storefront

# Copy source
COPY apps/customer_storefront/ ./apps/customer_storefront/
COPY src/ ./src/
COPY tsconfig.json ./

# Build standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=customer_storefront

# =================== Stage 2: Runner ===================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer_storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer_storefront/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/customer_storefront/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => r.statusCode===200 ? process.exit(0) : process.exit(1)).on('error', ()=>process.exit(1))"

CMD ["node", "server.js"]