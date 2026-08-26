FROM node:24-alpine AS build

ENV HUSKY=0

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/db/package.json ./packages/db/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/db ./packages/db

RUN pnpm --filter @linonward/api build

FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app/apps/api

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./dist
# The workspace symlink in node_modules resolves here. Copy the package's
# runtime contract and pnpm dependency links; source and tooling stay behind.
COPY --from=build --chown=node:node /app/packages/db/package.json /app/packages/db/package.json
COPY --from=build --chown=node:node /app/packages/db/dist /app/packages/db/dist
COPY --from=build --chown=node:node /app/packages/db/migrations /app/packages/db/migrations
COPY --from=build --chown=node:node /app/packages/db/node_modules /app/packages/db/node_modules

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
