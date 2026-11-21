# ==============================================================================
# ZHR Synergy Cinema Intro & Voice-Over Studio — Universal Production Dockerfile
# Compatible with: Google Cloud Run, Railway, Render, Fly.io, AWS App Runner
# ==============================================================================

FROM node:20-slim AS runner

# Install FFmpeg and basic utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy all project source files
COPY . .

# Build Vite client production bundle into dist/
RUN npm run build

# Configure Cloud Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start server using tsx
CMD ["npm", "run", "start"]
