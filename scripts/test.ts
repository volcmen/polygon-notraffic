const DEFAULT_SUITE = "unit";
const FAILURE_EXIT_CODE = 1;

const SUITE_PATHS = {
	all: "__tests__",
	e2e: "__tests__/e2e",
	integration: "__tests__/integration",
	unit: "__tests__/unit",
} as const;

type SuiteName = keyof typeof SUITE_PATHS;

const isSuiteName = (value: string): value is SuiteName => value in SUITE_PATHS;

const args = process.argv.slice(2);
const requestedSuite = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_SUITE;
const forwardedFlags = args.filter((arg) => arg.startsWith("--"));

if (!isSuiteName(requestedSuite)) {
	console.error(`Unknown test suite "${requestedSuite}". Expected one of: ${Object.keys(SUITE_PATHS).join(', ')}.`);
	process.exit(FAILURE_EXIT_CODE);
}

const testProcess = Bun.spawnSync(["bun", "test", "--pass-with-no-tests", ...forwardedFlags, SUITE_PATHS[requestedSuite]], {
	stdio: ["inherit", "inherit", "inherit"],
});

process.exit(testProcess.exitCode);
