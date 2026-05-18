import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const ROOT_MARKER_FILE = 'turbo.json';

const findWorkspaceRoot = (startDir = process.cwd()): string => {
	let currentDir = startDir;

	while (true) {
		if (existsSync(join(/* turbopackIgnore: true */ currentDir, ROOT_MARKER_FILE))) {
			return currentDir;
		}

		const parentDir = dirname(currentDir);

		if (parentDir === currentDir) {
			return startDir;
		}

		currentDir = parentDir;
	}
};

const resolveDatabasePath = (dbPath: string): string => {
	if (dbPath === ':memory:' || isAbsolute(dbPath)) {
		return dbPath;
	}

	return resolve(findWorkspaceRoot(), dbPath);
};

export { findWorkspaceRoot, resolveDatabasePath };
