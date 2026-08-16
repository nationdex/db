import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * Patch fs.promises.mkdir for the Bun runtime on Windows, where calling
 * `mkdir(".", { recursive: true })` throws EEXIST instead of being a no-op.
 */
let isBunMkdirPatched = false
export function patchBunMkdir(): void {
    if (isBunMkdirPatched) return
    isBunMkdirPatched = true

    if (typeof process !== "undefined" && (process.versions as Record<string, string | undefined>)?.bun) {
        const originalMkdir = fs.promises.mkdir
        fs.promises.mkdir = (async (targetPath: fs.PathLike, options?: fs.MakeDirectoryOptions & { recursive?: boolean | null }) => {
            const p = String(targetPath)
            if (p === "." || p === "./" || p === ".\\") return undefined
            try {
                return await originalMkdir.call(fs.promises, targetPath, options)
            } catch (err: any) {
                if (err?.code === "EEXIST") return undefined
                throw err
            }
        }) as typeof fs.promises.mkdir
    }
}

// Automatically patch Bun on module load
patchBunMkdir()

/**
 * Resolves and loads an optional or peer database driver module across various
 * package managers (PNPM isolated node_modules, Bun, NPM, Yarn PnP, monorepos).
 *
 * @param name - The package name to resolve (e.g. "sqlite3", "better-sqlite3", "mysql2", "pg", "mongodb", "surrealdb").
 * @param customDriver - Optional pre-instantiated driver or module supplied by user.
 */
export function resolveModule<T = any>(name: string, customDriver?: T): T | undefined {
    if (customDriver) return customDriver

    // 1. Standard require from the current module context
    try {
        return require(name)
    } catch {}

    // 2. Resolve from the application entrypoint (require.main)
    try {
        if (require.main && typeof require.main.require === "function") {
            return require.main.require(name)
        }
    } catch {}

    // 3. Resolve from process.cwd() using createRequire
    try {
        const cwdRequire = createRequire(path.resolve(process.cwd(), "package.json"))
        return cwdRequire(name)
    } catch {}

    try {
        const cwdRequire = createRequire(path.resolve(process.cwd(), "index.js"))
        return cwdRequire(name)
    } catch {}

    // 4. Resolve from process.mainModule if available
    try {
        const mainMod = (process as any).mainModule
        if (mainMod && typeof mainMod.require === "function") {
            return mainMod.require(name)
        }
    } catch {}

    // 5. Try resolving through paths array from cwd
    try {
        const resolvedPath = require.resolve(name, {
            paths: [process.cwd(), path.join(process.cwd(), "node_modules")],
        })
        return require(resolvedPath)
    } catch {}

    return undefined
}

/**
 * Dynamic ESM import helper with multi-tier resolution for ESM-only packages (such as `@surrealdb/node`).
 */
export async function resolveESM<T = any>(name: string): Promise<T | undefined> {
    const importFn = new Function("s", "return import(s)")

    // 1. Direct dynamic import
    try {
        return await importFn(name)
    } catch {}

    // 2. Resolve path relative to process.cwd() and import via file URL
    try {
        const cwdRequire = createRequire(path.resolve(process.cwd(), "package.json"))
        const resolvedPath = cwdRequire.resolve(name)
        const fileUrl = pathToFileURL(resolvedPath).href
        return await importFn(fileUrl)
    } catch {}

    return undefined
}
