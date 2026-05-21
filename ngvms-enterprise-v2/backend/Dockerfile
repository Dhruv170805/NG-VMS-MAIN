FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies for canvas, sharp, and others if needed
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Install native runtime dependencies
RUN apk add --no-cache cairo pango libjpeg-turbo giflib

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Set environment to production
ENV NODE_ENV=production
ENV PORT=5000

# Expose the API port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
