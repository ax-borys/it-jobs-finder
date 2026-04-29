FROM node:25.9 AS base
RUN npm install -g pnpm

FROM base AS dev
WORKDIR /app
CMD pnpm dev
EXPOSE 3000

FROM base AS build
WORKDIR /repo

COPY . .

ENV CI=true

RUN pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm --filter @job-parser/api deploy --prod /out

FROM node:25.9 AS prod
WORKDIR /app

COPY --from=build /out .

CMD npm start

EXPOSE 80
