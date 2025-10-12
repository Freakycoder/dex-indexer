FROM node:20-alpine AS builder

WORKDIR /frontend

COPY package.json ./

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . ./

RUN pnpm build

FROM node:20-alpine AS runtime

WORKDIR /frontend_runtime

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /frontend/package*.json ./
COPY --from=builder /frontend/.next ./.next
COPY --from=builder /frontend/public ./public
COPY --from=builder /frontend/node_modules ./node_modules

EXPOSE 3000

CMD [ "pnpm", "start" ]
