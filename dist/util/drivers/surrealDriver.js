"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurrealDriver = void 0;
const database_1 = require("../database");
const resolver_1 = require("../resolver");
(0, resolver_1.patchBunMkdir)();
let surrealModule = null;
/**
 * Native ESM dynamic import helper.
 *
 * TypeScript's CommonJS emit turns `await import("...")` into a `require()`
 * call, which fails for ESM-only packages such as `@surrealdb/node`. Using
 * `new Function` keeps the runtime `import()` intact so CJS consumers can
 * load the optional embedded-engine binary.
 */
function importESM(specifier) {
    // eslint-disable-next-line no-new-func
    return new Function("specifier", "return import(specifier)")(specifier);
}
function loadSurrealSDK(customDriver) {
    if (surrealModule)
        return surrealModule;
    const mod = (0, resolver_1.resolveModule)("surrealdb", customDriver);
    if (mod) {
        surrealModule = mod;
        return mod;
    }
    throw new Error(`SurrealDB SDK (\`surrealdb\`) is not installed or failed to load.\n` +
        `Install it with:\n` +
        `  • pnpm:  pnpm add surrealdb${needsEmbedded() ? " @surrealdb/node" : ""}\n` +
        `  • bun:   bun add surrealdb${needsEmbedded() ? " @surrealdb/node" : ""}\n` +
        `  • npm:   npm i surrealdb${needsEmbedded() ? " @surrealdb/node" : ""}`);
}
// Holder for the user's options so `needsEmbedded()` can be called
// before the constructor finishes initialising.
let pendingOptions = null;
function needsEmbedded() {
    if (!pendingOptions)
        return false;
    return !pendingOptions.url;
}
/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
}
/**
 * Detect TypeORM `FindOperator` instances (e.g. `Like`) passed in
 * `find()` filter objects. We duck-type to avoid a hard `import` from
 * `typeorm` inside the SurrealDB driver — the shape is stable across
 * TypeORM 0.3.x: instances carry `_type: string` and `_value: unknown`.
 */
function isFindOperator(v) {
    return typeof v === "object" && v !== null && "_type" in v && "_value" in v;
}
/** Extract the raw value from a `FindOperator` or return the value as-is. */
function unwrapOperator(v) {
    return isFindOperator(v) ? v._value : v;
}
/** Map a SurrealDB record row back to the ForgeDB `SQLiteRecord` shape. */
function mapRecord(row) {
    if (!row)
        return null;
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.entityId,
        type: row.type,
        value: row.value,
        guildId: row.guildId,
    };
}
/** Map a SurrealDB cooldown row back to the ForgeDB `CooldownData` shape. */
function mapCooldown(row) {
    if (!row)
        return null;
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.entityId,
        startedAt: row.startedAt,
        duration: row.duration,
    };
}
/* ------------------------------------------------------------------ *
 * Driver
 * ------------------------------------------------------------------ */
const RECORD_TABLE = "record";
const COOLDOWN_TABLE = "cooldown";
const DEFAULT_NAMESPACE = "forge";
const DEFAULT_DATABASE = "forge.db";
const IMPORT_CHUNK_SIZE = 1000;
class SurrealDriver {
    emitter;
    options;
    db;
    // SDK references (populated lazily in init)
    Surreal;
    RecordId;
    Table;
    eq;
    and;
    constructor(emitter, options) {
        this.emitter = emitter;
        this.options = options;
        pendingOptions = options;
    }
    async init() {
        const sdk = loadSurrealSDK(this.options.driver);
        this.Surreal = sdk.Surreal;
        this.RecordId = sdk.RecordId;
        this.Table = sdk.Table;
        this.eq = sdk.eq;
        this.and = sdk.and;
        const isEmbedded = !this.options.url;
        if (isEmbedded) {
            // Embedded engines require @surrealdb/node (ESM-only, native binary).
            let createNodeEngines = null;
            try {
                // @surrealdb/node is an optional ESM-only package; load it dynamically.
                const nodeModule = (await (0, resolver_1.resolveESM)("@surrealdb/node")) ?? (await importESM("@surrealdb/node"));
                createNodeEngines = nodeModule?.createNodeEngines ?? null;
            }
            catch { }
            if (!createNodeEngines) {
                throw new Error("Embedded SurrealDB engine (`@surrealdb/node`) is not installed or failed to load.\n" +
                    "Install it with:\n" +
                    "  • pnpm:  pnpm add @surrealdb/node\n" +
                    "  • bun:   bun add @surrealdb/node\n" +
                    "  • npm:   npm i @surrealdb/node");
            }
            const nodeEngines = createNodeEngines;
            const engine = this.options.engine ?? "surrealkv";
            const folder = this.options.folder ?? "database";
            const connectionString = this.buildEmbeddedConnectionString(engine, folder);
            this.db = new this.Surreal({
                engines: {
                    ...this.createRemoteEngines(sdk),
                    ...nodeEngines(),
                },
            });
            await this.db.connect(connectionString);
        }
        else {
            this.db = new this.Surreal();
            await this.db.connect(this.options.url, {
                namespace: this.options.namespace ?? DEFAULT_NAMESPACE,
                database: this.options.database ?? DEFAULT_DATABASE,
                authentication: this.buildAuth(),
            });
        }
        // For embedded connections we still need to select namespace/db.
        if (isEmbedded) {
            await this.db.use({
                namespace: this.options.namespace ?? DEFAULT_NAMESPACE,
                database: this.options.database ?? DEFAULT_DATABASE,
            });
        }
        // Ensure tables exist (schemaless — records can have any fields).
        await this.db.query(`DEFINE TABLE IF NOT EXISTS ${RECORD_TABLE} SCHEMALESS;`);
        await this.db.query(`DEFINE TABLE IF NOT EXISTS ${COOLDOWN_TABLE} SCHEMALESS;`);
    }
    /** Best-effort extraction of `createRemoteEngines` from the SDK module. */
    createRemoteEngines(sdk) {
        const mod = sdk;
        if (typeof mod.createRemoteEngines === "function") {
            return mod.createRemoteEngines();
        }
        return {};
    }
    buildEmbeddedConnectionString(engine, folder) {
        switch (engine) {
            case "mem":
                return "mem://";
            case "rocksdb":
                return `rocksdb://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`;
            case "surrealkv":
                return `surrealkv://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`;
            default:
                return `surrealkv://${folder}/${this.options.database ?? DEFAULT_DATABASE}.db`;
        }
    }
    buildAuth() {
        if (this.options.token)
            return { token: this.options.token };
        if (this.options.username || this.options.password) {
            return {
                username: this.options.username,
                password: this.options.password,
            };
        }
        return undefined;
    }
    /* ---- Record CRUD ---- */
    async set(data) {
        const identifier = database_1.DataBase.make_intetifier(data);
        const rid = new this.RecordId(RECORD_TABLE, identifier);
        // Fetch existing record for event semantics.
        const existing = (await this.db.select(rid));
        const content = {
            identifier,
            name: data.name,
            entityId: data.id,
            type: data.type,
            value: data.value,
        };
        if (isGuildData(data))
            content.guildId = data.guildId;
        // UPSERT: creates the record if absent, replaces content if present.
        await this.db.upsert(rid).content(content);
        const newData = mapRecord({ ...content, id: rid });
        if (existing) {
            this.emitter.emit("variableUpdate", {
                newData,
                oldData: mapRecord(existing),
            });
        }
        else {
            this.emitter.emit("variableCreate", { data: newData });
        }
    }
    async get(data) {
        const identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
        const rid = new this.RecordId(RECORD_TABLE, identifier);
        const row = (await this.db.select(rid));
        return mapRecord(row ?? null);
    }
    async getAll() {
        const table = new this.Table(RECORD_TABLE);
        const rows = (await this.db.select(table));
        return rows.map((r) => mapRecord(r));
    }
    async find(data) {
        const table = new this.Table(RECORD_TABLE);
        if (!data || Object.keys(data).length === 0) {
            return await this.getAll();
        }
        // Build WHERE conditions from the filter object.
        // Field `id` is stored as `entityId` in SurrealDB — remap.
        const conditions = [];
        for (const [key, rawValue] of Object.entries(data)) {
            if (rawValue === undefined || rawValue === null)
                continue;
            const fieldName = key === "id" ? "entityId" : key;
            const value = unwrapOperator(rawValue);
            if (value === undefined || value === null)
                continue;
            conditions.push(this.eq(fieldName, value));
        }
        if (conditions.length === 0) {
            return await this.getAll();
        }
        const where = conditions.length === 1 ? conditions[0] : this.and(...conditions);
        const rows = (await this.db.select(table).where(where));
        return rows.map((r) => mapRecord(r));
    }
    async delete(data) {
        const identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
        const rid = new this.RecordId(RECORD_TABLE, identifier);
        const existing = (await this.db.select(rid));
        this.emitter.emit("variableDelete", { data: mapRecord(existing ?? null) });
        await this.db.delete(rid);
    }
    async wipe() {
        const table = new this.Table(RECORD_TABLE);
        await this.db.delete(table);
    }
    /**
     * Build the content object for a record (stored in SurrealDB).
     *
     * The `id` field is remapped to `entityId` to avoid collision with
     * SurrealDB's reserved `id` (record ID) field.
     */
    buildRecordContent(data) {
        const content = {
            identifier: database_1.DataBase.make_intetifier(data),
            name: data.name,
            entityId: data.id,
            type: data.type,
            value: data.value,
        };
        if (isGuildData(data))
            content.guildId = data.guildId;
        return content;
    }
    async importRecords(records) {
        let count = 0;
        for (let i = 0; i < records.length; i += IMPORT_CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT_CHUNK_SIZE);
            const statements = [];
            const bindings = {};
            chunk.forEach((record, idx) => {
                const identifier = database_1.DataBase.make_intetifier(record);
                const idKey = `id${idx}`;
                const contentKey = `c${idx}`;
                // type::record() safely constructs the record ID from
                // a table name + identifier string — fully parameterised,
                // no string interpolation, immune to injection.
                statements.push(`UPSERT type::record('${RECORD_TABLE}', $${idKey}) CONTENT $${contentKey}`);
                bindings[idKey] = identifier;
                bindings[contentKey] = this.buildRecordContent(record);
            });
            await this.db.query(statements.join("; "), bindings);
            count += chunk.length;
        }
        return count;
    }
    /* ---- Cooldown CRUD ---- */
    async cdWipe() {
        const table = new this.Table(COOLDOWN_TABLE);
        await this.db.delete(table);
    }
    async cdAdd(data) {
        const identifier = database_1.DataBase.make_cdIdentifier(data);
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier);
        await this.db.upsert(rid).content({
            identifier,
            name: data.name,
            entityId: data.id,
            startedAt: Date.now(),
            duration: data.duration,
        });
    }
    async cdDelete(identifier) {
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier);
        await this.db.delete(rid);
    }
    async cdTimeLeft(identifier) {
        const rid = new this.RecordId(COOLDOWN_TABLE, identifier);
        const row = (await this.db.select(rid));
        if (!row) {
            return { left: 0 };
        }
        const mapped = mapCooldown(row);
        return {
            ...mapped,
            left: Math.max(row.duration - (Date.now() - row.startedAt), 0),
        };
    }
    /* ---- Raw query + ping ---- */
    async query(q) {
        const result = await this.db.query(q);
        // db.query() returns a Query object (extends Promise).
        // Awaiting it collects results as an array (one entry per statement).
        return result;
    }
    async ping() {
        // SurrealQL `RETURN 1` is the lightest possible round-trip.
        return await this.db.query("RETURN 1");
    }
}
exports.SurrealDriver = SurrealDriver;
//# sourceMappingURL=surrealDriver.js.map