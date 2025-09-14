FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Default command (used for worker-job)
CMD ["node", "worker.js"]
