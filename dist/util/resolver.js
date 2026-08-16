"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchBunMkdir = patchBunMkdir;
exports.resolveModule = resolveModule;
exports.resolveESM = resolveESM;
const node_fs_1 = __importDefault(require("node:fs"));
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
/**
 * Patch fs.promises.mkdir for the Bun runtime on Windows, where calling
 * `mkdir(".", { recursive: true })` throws EEXIST instead of being a no-op.
 */
let isBunMkdirPatched = false;
function patchBunMkdir() {
    if (isBunMkdirPatched)
        return;
    isBunMkdirPatched = true;
    if (typeof process !== "undefined" && process.versions?.bun) {
        const originalMkdir = node_fs_1.default.promises.mkdir;
        node_fs_1.default.promises.mkdir = (async (targetPath, options) => {
            const p = String(targetPath);
            if (p === "." || p === "./" || p === ".\\")
                return undefined;
            try {
                return await originalMkdir.call(node_fs_1.default.promises, targetPath, options);
            }
            catch (err) {
                if (err?.code === "EEXIST")
                    return undefined;
                throw err;
            }
        });
    }
}
// Automatically patch Bun on module load
patchBunMkdir();
/**
 * Resolves and loads an optional or peer database driver module across various
 * package managers (PNPM isolated node_modules, Bun, NPM, Yarn PnP, monorepos).
 *
 * @param name - The package name to resolve (e.g. "sqlite3", "better-sqlite3", "mysql2", "pg", "mongodb", "surrealdb").
 * @param customDriver - Optional pre-instantiated driver or module supplied by user.
 */
function resolveModule(name, customDriver) {
    if (customDriver)
        return customDriver;
    // 1. Standard require from the current module context
    try {
        return require(name);
    }
    catch { }
    // 2. Resolve from the application entrypoint (require.main)
    try {
        if (require.main && typeof require.main.require === "function") {
            return require.main.require(name);
        }
    }
    catch { }
    // 3. Resolve from process.cwd() using createRequire
    try {
        const cwdRequire = (0, node_module_1.createRequire)(node_path_1.default.resolve(process.cwd(), "package.json"));
        return cwdRequire(name);
    }
    catch { }
    try {
        const cwdRequire = (0, node_module_1.createRequire)(node_path_1.default.resolve(process.cwd(), "index.js"));
        return cwdRequire(name);
    }
    catch { }
    // 4. Resolve from process.mainModule if available
    try {
        const mainMod = process.mainModule;
        if (mainMod && typeof mainMod.require === "function") {
            return mainMod.require(name);
        }
    }
    catch { }
    // 5. Try resolving through paths array from cwd
    try {
        const resolvedPath = require.resolve(name, {
            paths: [process.cwd(), node_path_1.default.join(process.cwd(), "node_modules")],
        });
        return require(resolvedPath);
    }
    catch { }
    return undefined;
}
/**
 * Dynamic ESM import helper with multi-tier resolution for ESM-only packages (such as `@surrealdb/node`).
 */
async function resolveESM(name) {
    const importFn = new Function("s", "return import(s)");
    // 1. Direct dynamic import
    try {
        return await importFn(name);
    }
    catch { }
    // 2. Resolve path relative to process.cwd() and import via file URL
    try {
        const cwdRequire = (0, node_module_1.createRequire)(node_path_1.default.resolve(process.cwd(), "package.json"));
        const resolvedPath = cwdRequire.resolve(name);
        const fileUrl = (0, node_url_1.pathToFileURL)(resolvedPath).href;
        return await importFn(fileUrl);
    }
    catch { }
    return undefined;
}
//# sourceMappingURL=resolver.js.map