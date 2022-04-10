FROM node:16-bullseye-slim as base

FROM base as deps
RUN mkdir /app
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm install --production=false

FROM base as production-deps
RUN mkdir /app
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json ./
RUN npm prune --production

FROM base as build
ENV NODE_ENV=production
RUN mkdir /app
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN npm run build

FROM base
ENV NODE_ENV=production
RUN mkdir /app
WORKDIR /app
COPY --from=production-deps /app/package.json /app/package.json
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/build /app/build
CMD ["npm", "run", "start"]
