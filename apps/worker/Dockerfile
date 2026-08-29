FROM node:24-alpine AS build

ENV HUSKY=0
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/db/package.json ./packages/db/package.json
COPY apps/worker/package.json ./apps/worker/package.json
RUN pnpm install --frozen-lockfile

COPY apps/worker ./apps/worker
COPY packages/db ./packages/db
RUN pnpm --filter @linonward/worker build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/worker

COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/apps/worker/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/worker/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/worker/dist ./dist
COPY --from=build --chown=node:node /app/packages/db/package.json /app/packages/db/package.json
COPY --from=build --chown=node:node /app/packages/db/dist /app/packages/db/dist
COPY --from=build --chown=node:node /app/packages/db/node_modules /app/packages/db/node_modules

USER node
CMD ["node", "dist/index.js"]
