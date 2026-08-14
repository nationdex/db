import { DataBase } from "../database"
import type { CooldownData, GuildData, RecordData, SQLiteRecord } from "../types"
import type { DBEmitter, IDBDriver } from "./driver"

/* ------------------------------------------------------------------ *
 * Type stub for the optional @surrealdb/node package
 *
 * The real package is ESM-only and not installed by default. We use
 * a dynamic `import()` at runtime and type the return manually.
 * ------------------------------------------------------------------ */

interface SurrealNodeModule {
    createNodeEngines(options?: Record<string, unknown>): Record<string, unknown>
}

/* ------------------------------------------------------------------ *
 * Lazy SDK loading
 *
 * The `surrealdb` package supports CommonJS (`require`), so we load it
 * lazily inside the driver — the module is only resolved when a user
 * actually selects `type: "surrealdb"`. This avoids a hard dependency
 * for users who only use SQLite / MySQL / PostgreSQL / MongoDB.
 *
 * The `@surrealdb/node` package (embedded engines: rocksdb, surrealkv,
 * mem) is ESM-only and ships native binaries. We load it via dynamic
 * `import()` at runtime, which Node.js supports even from CommonJS
 * modules.
 * ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SurrealInstance = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SurrealConstructor = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordIdConstructor = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableConstructor = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExprFunction = any

interface SurrealModule {
    Surreal: SurrealConstructor
    RecordId: RecordIdConstructor
    Table: TableConstructor
    eq: ExprFunction
    and: ExprFunction
}

let surrealModule: SurrealModule | null = null

/**
 * Native ESM dynamic import helper.
 *
 * TypeScript's CommonJS emit turns `await import("...")` into a `require()`
 * call, which fails for ESM-only packages such as `@surrealdb/node`. Using
 * `new Function` keeps the runtime `import()` intact so CJS consumers can
 * load the optional embedded-engine binary.
 */
function importESM(specifier: string): Promise<unknown> {
    // eslint-disable-next-line no-new-func
    return new Function("specifier", "return import(specifier)")(specifier) as Promise<unknown>
}

function loadSurrealSDK(): SurrealModule {
    if (surrealModule) return surrealModule
    try {
        // `surrealdb` ships CJS exports — safe to require from CommonJS.
        const mod = require("surrealdb") as SurrealModule
        surrealModule = mod
        return mod
    } catch {
        throw new Error(`SurrealDB SDK (\`surrealdb\`) is not installed. Install it with:  npm install surrealdb${needsEmbedded() ? " @surrealdb/node" : ""}`)
    }
}

// Holder for the user's options so `needsEmbedded()` can be called
// before the constructor finishes initialising.
let pendingOptions: ISurrealOptions | null = null

function needsEmbedded(): boolean {
    if (!pendingOptions) return false
    return !pendingOptions.url
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

interface ISurrealOptions {
    type: "surrealdb"
    url?: string
    username?: string
    password?: string
    token?: string
    folder?: string
    engine?: "surrealkv" | "rocksdb" | "mem"
    namespace?: string
    database?: string
}

/**
 * Shape of a record as stored in SurrealDB.
 *
 * SurrealDB reserves the `id` field for the record ID, so the ForgeDB
 * entity `id` (Discord snowflake etc.) is stored as `entityId` and
 * mapped back to `id` on retrieval. This is transparent to all
 * function files and event handlers.
 */
interface SurrealRecordRow {
    id: unknown // SurrealDB RecordId — not the ForgeDB entity id
    identifier: string
    name: string
    entityId: string
    type: string
    value: string
    guildId?: string
}

interface SurrealCooldownRow {
    id: unknown
    identifier: string
    name: string
    entityId?: string
    startedAt: number
    duration: number
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
}

/**
 * Detect TypeORM `FindOperator` instances (e.g. `Like`) passed in
 * `find()` filter objects. We duck-type to avoid a hard `import` from
 * `typeorm` inside the SurrealDB driver — the shape is stable across
 * TypeORM 0.3.x: instances carry `_type: string` and `_value: unknown`.
 */
function isFindOperator(v: unknown): v is { _type: string; _value: unknown } {
    return typeof v === "object" && v !== null && "_type" in v && "_value" in v
}

/** Extract the raw value from a `FindOperator` or return the value as-is. */
function unwrapOperator(v: unknown): unknown {
    return isFindOperator(v) ? v._value : v
}

/** Map a SurrealDB record row back to the ForgeDB `SQLiteRecord` shape. */
function mapRecord(row: SurrealRecordRow | null | undefined): SQLiteRecord | null {
    if (!row) return null
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.entityId,
        type: row.type as SQLiteRecord["type"],
        value: row.value,
        guildId: row.guildId,
    }
}

/** Map a SurrealDB cooldown row back to the ForgeDB `CooldownData` shape. */
function mapCooldown(row: SurrealCooldownRow | null | undefined): CooldownData | null {
    if (!row) return null
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.entityId,
        startedAt: row.startedAt,
        duration: row.duration,
    }
}

/* ------------------------------------------------------------------ *
 * Driver
 * ------------------------------------------------------------------ */

const RECORD_TABLE = "record"
const COOLDOWN_TABLE = "cooldown"
const DEFAULT_NAMESPACE = "forge"
const DEFAULT_DATABASE = "forge.db"
const IMPORT_CHUNK_SIZE = 1000

export class SurrealDriver implements IDBDriver {
    private readonly emitter: DBEmitter
    private readonly options: ISurrealOptions
    private db!: SurrealInstance

    // SDK references (populated lazily in init)
    private Surreal!: SurrealConstructor
    private RecordId!: RecordIdConstructor
    private Table!: TableConstructor
    private eq!: ExprFunction
    private and!: ExprFunction

    constructor(emitter: DBEmitter, options: ISurrealOptions) {
        this.emitter = emitter
        this.options = options
        pendingOptions = options
    }

    async init(): Promise<void> {
        const sdk = loadSurrealSDK()
        this.Surreal = sdk.Surreal
        this.RecordId = sdk.RecordId
        this.Table = sdk.Table
        this.eq = sdk.eq
        this.and = sdk.and

        const isEmbedded = !this.options.url

        if (isEmbedded) {
            // Embedded engines require @surrealdb/node (ESM-only, native binary).
            // Dynamic import() works from CJS at runtime in Node.js 14+.
            let createNodeEngines: ((options?: Record<string, unknown>) => Record<string, unknown>) | null = null
            try {
                // @surrealdb/node is an optional ESM-only package; load it dynamically.
                const nodeModule = (await importESM("@surrealdb/node")) as SurrealNodeModule
                createNodeEngines = nodeModule.createNodeEngines
            } catch {
                throw new Error("Embedded SurrealDB engine (`@surrealdb/node`) is not installed. " + "Install it with:  npm install @surrealdb/node")
            }

            // After the try/catch above, createNodeEngines is guaranteed non-null
            // because the catch branch throws. TS can't track this, so we assert.
            const nodeEngines = createNodeEngines!
            const engine = this.options.engine ?? "surrealkv"
            const folder = this.options.folder ?? "database"
            const connectionString = this.buildEmbeddedConnectionString(engine, folder)

            this.db = new this.Surreal({
                engines: {
                    ...this.createRemoteEngines(sdk),
                    ...nodeEngines(),
                },
            })
            await this.db.connect(connectionString)
        } else {
            this.db = new this.Surreal()
            await this.db.connect(this.options.url, {
                namespace: this.options.namespace ?? DEFAULT_NAMESPACE,
                database: this.options.database ?? DEFAULT_DATABASE,
                authentication: this.buildAuth(),
            })
        }

        // For embedded connections we still need to select namespace/db.
        if (isEmbedded) {
            await this.db.use({
                namespace: this.options.namespace ?? DEFAULT_NAMESPACE,
                database: this.options.database ?? DEFAULT_DATABASE,
            })
        }

        // Ensure tables exist (schemaless — records can have any fields).
        await this.db.query(`DEFINE TABLE IF NOT EXISTS ${RECORD_TABLE} SCHEMALESS;`)
        await this.db.query(`DEFINE TABLE IF NOT EXISTS ${COOLDOWN_TABLE} SCHEMALESS;`)
    }

    /** Best-effort extraction of `createRemoteEngines` from the SDK module. */
    private createRemoteEngines(sdk: SurrealModule): Record<string, unknown> {
        const mod = sdk as unknown as { createRemoteEngines?: () => Record<string, unknown> }
        if (typeof mod.createRemoteEngines === "function") {
            return mod.createRemoteEngines()
        }
        return {}
    }

    private buildEmbeddedConnectionString(engine: string, folder: string): string {
        switch (engine) {
            case "mem":
                return "mem://"
            case "rocksdb":
                return `rocksdb://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`
            case "surrealkv":
                return `surrealkv://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`
            default:
                return `surrealkv://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`
        }
    }

    private buildAuth(): { username?: string; password?: string } | { token?: string } | undefined {
        if (this.options.token) return { token: this.options.token }
        if (this.options.username || this.options.password) {
            return {
                username: this.options.username,
                password: this.options.password,
            }
        }
        return undefined
    }

    /* ---- Record CRUD ---- */

    async set(data: RecordData): Promise<void> {
        const identifier = DataBase.make_intetifier(data)
        const rid = new this.RecordId(RECORD_TABLE, identifier)

        // Fetch existing record for event semantics.
        const existing = (await this.db.select(rid)) as SurrealRecordRow | null

        const content: Record<string, unknown> = {
            identifier,
            name: data.name,
            entityId: data.id,
            type: data.type,
            value: data.value,
        }
        if (isGuildData(data)) content.guildId = data.guildId

        // UPSERT: creates the record if absent, replaces content if present.
        await this.db.upsert(rid).content(content)

        const newData = mapRecord({ ...(content as unknown as SurrealRecordRow), id: rid }) as SQLiteRecord
        if (existing) {
            this.emitter.emit("variableUpdate", {
                newData,
                oldData: mapRecord(existing),
            })
        } else {
            this.emitter.emit("variableCreate", { data: newData })
        }
    }

    async get(data: RecordData): Promise<SQLiteRecord | null> {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        const rid = new this.RecordId(RECORD_TABLE, identifier)
        const row = (await this.db.select(rid)) as SurrealRecordRow | null | undefined
        return mapRecord(row ?? null)
    }

    async getAll(): Promise<SQLiteRecord[]> {
        const table = new this.Table(RECORD_TABLE)
        const rows = (await this.db.select(table)) as SurrealRecordRow[]
        return rows.map((r) => mapRecord(r) as SQLiteRecord)
    }

    async find(data?: RecordData): Promise<SQLiteRecord[]> {
        const table = new this.Table(RECORD_TABLE)

        if (!data || Object.keys(data).length === 0) {
            return await this.getAll()
        }

        // Build WHERE conditions from the filter object.
        // Field `id` is stored as `entityId` in SurrealDB — remap.
        const conditions: unknown[] = []
        for (const [key, rawValue] of Object.entries(data)) {
            if (rawValue === undefined || rawValue === null) continue

            const fieldName = key === "id" ? "entityId" : key
            const value = unwrapOperator(rawValue)
            if (value === undefined || value === null) continue

            conditions.push(this.eq(fieldName, value))
        }

        if (conditions.length === 0) {
            return await this.getAll()
        }

        const where = conditions.length === 1 ? conditions[0] : this.and(...conditions)
        const rows = (await this.db.select(table).where(where)) as SurrealRecordRow[]
        return rows.map((r) => mapRecord(r) as SQLiteRecord)
    }

    async delete(data: RecordData): Promise<void> {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        const rid = new this.RecordId(RECORD_TABLE, identifier)

        const existing = (await this.db.select(rid)) as SurrealRecordRow | null | undefined
        this.emitter.emit("variableDelete", { data: mapRecord(existing ?? null) })
        await this.db.delete(rid)
    }

    async wipe(): Promise<void> {
        const table = new this.Table(RECORD_TABLE)
        await this.db.delete(table)
    }

    /**
     * Build the content object for a record (stored in SurrealDB).
     *
     * The `id` field is remapped to `entityId` to avoid collision with
     * SurrealDB's reserved `id` (record ID) field.
     */
    private buildRecordContent(data: RecordData): Record<string, unknown> {
        const content: Record<string, unknown> = {
            identifier: DataBase.make_intetifier(data),
            name: data.name,
            entityId: data.id,
            type: data.type,
            value: data.value,
        }
        if (isGuildData(data)) content.guildId = data.guildId
        return content
    }

    async importRecords(records: RecordData[]): Promise<number> {
        let count = 0
        for (let i = 0; i < records.length; i += IMPORT_CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT_CHUNK_SIZE)
            const statements: string[] = []
            const bindings: Record<string, unknown> = {}

            chunk.forEach((record, idx) => {
                const identifier = DataBase.make_intetifier(record)
                const idKey = `id${idx}`
                const contentKey = `c${idx}`
                // type::record() safely constructs the record ID from
                // a table name + identifier string — fully parameterised,
                // no string interpolation, immune to injection.
                statements.push(`UPSERT type::record('${RECORD_TABLE}', $${idKey}) CONTENT $${contentKey}`)
                bindings[idKey] = identifier
                bindings[contentKey] = this.buildRecordContent(record)
            })

            await this.db.query(statements.join("; "), bindings)
            count += chunk.length
        }
        return count
    }

    /* ---- Cooldown CRUD ---- */

    async cdWipe(): Promise<void> {
        const table = new this.Table(COOLDOWN_TABLE)
        await this.db.delete(table)
    }

    async cdAdd(data: { name: string; id?: string; duration: number }): Promise<void> {
        const identifier = DataBase.make_cdIdentifier(data)
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier)

        await this.db.upsert(rid).content({
            identifier,
            name: data.name,
            entityId: data.id,
            startedAt: Date.now(),
            duration: data.duration,
        })
    }

    async cdDelete(identifier: string): Promise<void> {
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier)
        await this.db.delete(rid)
    }

    async cdTimeLeft(identifier: string): Promise<CooldownData & { left: number }> {
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier)
        const row = (await this.db.select(rid)) as SurrealCooldownRow | null | undefined

        if (!row) {
            return { left: 0 } as CooldownData & { left: number }
        }

        const mapped = mapCooldown(row) as CooldownData
        return {
            ...mapped,
            left: Math.max(row.duration - (Date.now() - row.startedAt), 0),
        }
    }

    /* ---- Raw query + ping ---- */

    async query(q: string): Promise<unknown> {
        const result = await this.db.query(q)
        // db.query() returns a Query object (extends Promise).
        // Awaiting it collects results as an array (one entry per statement).
        return result
    }

    async ping(): Promise<unknown> {
        // SurrealQL `RETURN 1` is the lightest possible round-trip.
        return await this.db.query("RETURN 1")
    }
}
