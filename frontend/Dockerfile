# Stage 1: Build Next.js app
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run app
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000

CMD ["npm", "run", "start"]
