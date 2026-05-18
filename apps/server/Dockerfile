# syntax=docker/dockerfile:1

ARG BUN_IMAGE=oven/bun:1.3.14
ARG HEALTHCHECK_SHELL_IMAGE=busybox:1.37.0-uclibc
ARG RUNTIME_IMAGE=gcr.io/distroless/base-debian12:nonroot

FROM ${HEALTHCHECK_SHELL_IMAGE} AS healthcheck-shell

FROM ${BUN_IMAGE} AS build
WORKDIR /app

ENV BUN_INSTALL_CACHE_DIR=/tmp/bun-cache

COPY . .
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
RUN mkdir -p /app/data
RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile /app/server \
	apps/server/src/index.ts
RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile /app/healthcheck \
	apps/server/src/healthcheck.ts

FROM ${RUNTIME_IMAGE} AS production
WORKDIR /app

COPY --from=build --chown=nonroot:nonroot /app/server ./server
COPY --from=build --chown=nonroot:nonroot /app/healthcheck ./healthcheck
COPY --from=build --chown=nonroot:nonroot /app/data /data
COPY --from=healthcheck-shell /bin/busybox /bin/sh

ENV NODE_ENV=production \
	SERVER_PORT=3001 \
	SQLITE_DB_PATH=/data/polygons.sqlite

EXPOSE 3001
USER nonroot:nonroot
CMD ["./server"]
