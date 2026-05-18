import { env } from "@repo/env";

/** @type {import('next').NextConfig} */
const apiOrigin = env.POLYGON_API_ORIGIN;

const nextConfig = {
	output: "standalone",
	transpilePackages: ["@repo/polygons", "@repo/ui"],
	async rewrites() {
		return [
			{
				source: "/api/polygons",
				destination: `${apiOrigin}/api/polygons`,
			},
			{
				source: "/api/polygons/:path*",
				destination: `${apiOrigin}/api/polygons/:path*`,
			},
		];
	},
};

export default nextConfig;
