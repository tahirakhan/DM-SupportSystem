FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Development ----
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- Builder ----
FROM base AS builder
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production ----
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
