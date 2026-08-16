export declare function patchBunMkdir(): void;
/**
 * Resolves and loads an optional or peer database driver module across various
 * package managers (PNPM isolated node_modules, Bun, NPM, Yarn PnP, monorepos).
 *
 * @param name - The package name to resolve (e.g. "sqlite3", "better-sqlite3", "mysql2", "pg", "mongodb", "surrealdb").
 * @param customDriver - Optional pre-instantiated driver or module supplied by user.
 */
export declare function resolveModule<T = any>(name: string, customDriver?: T): T | undefined;
/**
 * Dynamic ESM import helper with multi-tier resolution for ESM-only packages (such as `@surrealdb/node`).
 */
export declare function resolveESM<T = any>(name: string): Promise<T | undefined>;
//# sourceMappingURL=resolver.d.ts.map