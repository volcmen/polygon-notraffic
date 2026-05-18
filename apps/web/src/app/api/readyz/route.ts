import { NextResponse } from "next/server";

const dynamicChecks = async () => {
	return { app: true };
};

export async function GET() {
	const checks = await dynamicChecks();
	const allHealthy = Object.values(checks).every(Boolean);

	if (!allHealthy) {
		return NextResponse.json({ checks, status: "not_ready" }, { status: 503 });
	}

	return NextResponse.json({ checks, status: "ok" });
}

export async function HEAD() {
	const checks = await dynamicChecks();
	const allHealthy = Object.values(checks).every(Boolean);

	return new NextResponse(null, {
		status: allHealthy ? 200 : 503,
	});
}
