ARG BUN_IMAGE=oven/bun:1.3.14
ARG NEXT_PUBLIC_POLYGON_TRANSPORT=api
ARG POLYGON_API_ORIGIN=http://server:3001

FROM ${BUN_IMAGE} AS build
ARG NEXT_PUBLIC_POLYGON_TRANSPORT
ARG POLYGON_API_ORIGIN
WORKDIR /app

ENV BUN_INSTALL_CACHE_DIR=/tmp/bun-cache

COPY . .
RUN bun install --frozen-lockfile

ENV NODE_ENV=production \
	NEXT_PUBLIC_POLYGON_TRANSPORT=${NEXT_PUBLIC_POLYGON_TRANSPORT} \
	POLYGON_API_ORIGIN=${POLYGON_API_ORIGIN}
RUN cd apps/web && bun run build

FROM ${BUN_IMAGE} AS production
ARG NEXT_PUBLIC_POLYGON_TRANSPORT
ARG POLYGON_API_ORIGIN
WORKDIR /app

ENV NODE_ENV=production \
	PORT=3000 \
	HOSTNAME=0.0.0.0 \
	NEXT_PUBLIC_POLYGON_TRANSPORT=${NEXT_PUBLIC_POLYGON_TRANSPORT} \
	POLYGON_API_ORIGIN=${POLYGON_API_ORIGIN}

COPY --from=build --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=build --chown=bun:bun /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
USER bun
CMD ["bun", "apps/web/server.js"]
