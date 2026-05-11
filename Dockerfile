# Lucky Store Admin Web - Production Dockerfile
# Multi-stage build: Build React app with Vite, serve with Nginx

# ==========================================
# Stage 1: Build the application
# ==========================================
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/admin_web/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/admin_web/ ./

# Build the application
# Note: Environment variables should be passed at build time if needed
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx
# ==========================================
FROM nginx:1.27-alpine

# Install security headers module
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Set proper permissions
RUN chown -R appuser:nodejs /usr/share/nginx/html && \
    chown -R appuser:nodejs /var/cache/nginx && \
    chown -R appuser:nodejs /var/log/nginx && \
    chown -R appuser:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:nodejs /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
