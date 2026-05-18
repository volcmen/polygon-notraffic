import { describe, expect, it } from 'bun:test';
import { join, resolve } from 'node:path';
import { findWorkspaceRoot, resolveDatabasePath } from '../../src/path-utils.ts';

describe('resolveDatabasePath', () => {
	it('preserves in-memory SQLite paths', () => {
		expect(resolveDatabasePath(':memory:')).toBe(':memory:');
	});

	it('preserves absolute SQLite paths', () => {
		expect(resolveDatabasePath('/tmp/polygons.sqlite')).toBe('/tmp/polygons.sqlite');
	});

	it('finds the workspace root from a nested package directory', () => {
		const packageDir = process.cwd();
		const workspaceRoot = resolve(packageDir, '../..');

		expect(findWorkspaceRoot(packageDir)).toBe(workspaceRoot);
	});

	it('resolves relative SQLite paths from the workspace root', () => {
		const originalCwd = process.cwd();
		const workspaceRoot = resolve(originalCwd, '../..');

		try {
			process.chdir(join(workspaceRoot, 'apps/server'));

			expect(resolveDatabasePath('./data/polygons.sqlite')).toBe(resolve(workspaceRoot, './data/polygons.sqlite'));
		} finally {
			process.chdir(originalCwd);
		}
	});

	it('resolves a simple filename relative to workspace root', () => {
		const originalCwd = process.cwd();
		const workspaceRoot = resolve(originalCwd, '../..');

		try {
			process.chdir(join(workspaceRoot, 'apps/web'));

			const resolved = resolveDatabasePath('test.sqlite');
			expect(resolved).toBe(resolve(workspaceRoot, 'test.sqlite'));
		} finally {
			process.chdir(originalCwd);
		}
	});

	it('handles paths with multiple directory levels', () => {
		const originalCwd = process.cwd();
		const workspaceRoot = resolve(originalCwd, '../..');

		try {
			process.chdir(join(workspaceRoot, 'packages/db'));

			const resolved = resolveDatabasePath('./nested/deep/db.sqlite');
			expect(resolved).toBe(resolve(workspaceRoot, './nested/deep/db.sqlite'));
		} finally {
			process.chdir(originalCwd);
		}
	});
});
