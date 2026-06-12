FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

RUN npm install --workspace server

COPY prisma ./prisma
COPY server ./server

ENV DATABASE_URL=postgresql://tool_user:tool_password@postgres:5432/tool_inventory

RUN npm --workspace server run build

EXPOSE 4000

CMD ["npm", "--workspace", "server", "run", "start"]
