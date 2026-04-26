FROM node:25.9 AS build
WORKDIR /repo

RUN npm install -g pnpm

COPY . .

ENV CI=true

RUN pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm --filter @job-parser/api deploy --prod /out

FROM node:25.9
WORKDIR /app

COPY --from=build /out .

ENV NODE_ENV=production
CMD npm start

EXPOSE 80

