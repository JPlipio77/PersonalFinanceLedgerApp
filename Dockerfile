FROM node:20-alpine AS base
WORKDIR /app
COPY backend/package*.json ./

# Production target — production deps only
FROM base AS prod
RUN npm install --only=production --ignore-scripts
COPY backend/src/ ./src/
COPY backend/server.js .
EXPOSE 5000
CMD ["node", "server.js"]

# Development target (default) — includes devDependencies, uses nodemon
FROM base AS dev
RUN npm install
COPY backend/ .
EXPOSE 5000
CMD ["npm", "run", "dev"]
