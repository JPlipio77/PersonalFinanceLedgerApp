FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development target — includes devDependencies, uses nodemon
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Production target — production deps only
FROM base AS prod
RUN npm install --only=production --ignore-scripts
COPY src/ ./src/
COPY server.js .
EXPOSE 5000
CMD ["node", "server.js"]
