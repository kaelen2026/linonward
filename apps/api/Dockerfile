FROM node:24-alpine AS build

ENV HUSKY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

RUN pnpm --filter @linonward/api build

FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app/apps/api

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
# Read at runtime by dist/migrate.js, so they ship with the image rather than
# being baked into it.
COPY --from=build --chown=node:node /app/apps/api/migrations ./migrations

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
