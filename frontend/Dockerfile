FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Don't copy source files — volume will override them
EXPOSE 3000

CMD ["npm", "run", "dev"]