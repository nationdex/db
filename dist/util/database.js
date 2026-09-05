"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = void 0;
exports.Like = Like;
const pglite_1 = require("@electric-sql/pglite");
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
}
function Like(pattern) {
    return { __like: true, pattern };
}
function isLike(value) {
    return typeof value === "object" && value !== null && value.__like === true;
}
const COLUMN_MAP = { guildId: "guild_id" };
const RECORD_COLUMNS = new Set(["identifier", "name", "id", "type", "value", "guild_id"]);
function rowToRecord(row) {
    if (!row)
        return null;
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.id ?? undefined,
        type: row.type,
        value: row.value,
        guildId: row.guild_id ?? undefined,
    };
}
function rowToCooldown(row) {
    if (!row)
        return null;
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.id ?? undefined,
        startedAt: row.started_at,
        duration: Number(row.duration),
    };
}
/**
 * Static facade backed by an embedded PGlite (WASM Postgres) instance.
 *
 * All 70+ function files in `src/functions/` call these statics exclusively.
 */
class DataBase {
    emitter;
    options;
    static pg;
    static emitter;
    constructor(emitter, options) {
        this.emitter = emitter;
        this.options = options;
    }
    async init() {
        DataBase.emitter = this.emitter;
        DataBase.pg = new pglite_1.PGlite(this.options?.memory ? undefined : (this.options?.folder ?? "database"));
        await DataBase.pg.waitReady;
        await DataBase.pg.exec(`
            CREATE TABLE IF NOT EXISTS record (
                identifier TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                id TEXT,
                type TEXT NOT NULL,
                value TEXT NOT NULL,
                guild_id TEXT
            );
            CREATE TABLE IF NOT EXISTS cooldown (
                identifier TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                id TEXT,
                started_at TEXT NOT NULL,
                duration BIGINT NOT NULL
            );
        `);
        DataBase.emitter.emit("connect");
    }
    static make_intetifier(data) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`;
    }
    static make_cdIdentifier(data) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`;
    }
    static async set(data) {
        const identifier = data.identifier ?? this.make_intetifier(data);
        const guildId = isGuildData(data) ? (data.guildId ?? null) : null;
        const oldData = await this.get(data);
        await this.pg.query(`INSERT INTO record (identifier, name, id, type, value, guild_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (identifier) DO UPDATE SET name = $2, id = $3, type = $4, value = $5, guild_id = $6`, [identifier, data.name, data.id ?? null, data.type, data.value, guildId]);
        const newData = rowToRecord({ identifier, name: data.name, id: data.id, type: data.type, value: data.value, guild_id: guildId });
        if (oldData)
            this.emitter.emit("variableUpdate", { newData, oldData });
        else
            this.emitter.emit("variableCreate", { data: newData });
    }
    static async get(data) {
        const identifier = data.identifier ?? this.make_intetifier(data);
        const res = await this.pg.query("SELECT * FROM record WHERE identifier = $1", [identifier]);
        return rowToRecord(res.rows[0]);
    }
    static async getAll() {
        const res = await this.pg.query("SELECT * FROM record");
        return res.rows.map(rowToRecord);
    }
    static async find(data) {
        if (!data || Object.keys(data).length === 0)
            return this.getAll();
        const conditions = [];
        const params = [];
        for (const [key, value] of Object.entries(data)) {
            if (value === undefined)
                continue;
            const column = COLUMN_MAP[key] ?? key;
            if (!RECORD_COLUMNS.has(column))
                continue;
            if (value === null) {
                conditions.push(`${column} IS NULL`);
            }
            else if (isLike(value)) {
                params.push(value.pattern);
                conditions.push(`${column} LIKE $${params.length}`);
            }
            else {
                params.push(value);
                conditions.push(`${column} = $${params.length}`);
            }
        }
        if (conditions.length === 0)
            return this.getAll();
        const res = await this.pg.query(`SELECT * FROM record WHERE ${conditions.join(" AND ")}`, params);
        return res.rows.map(rowToRecord);
    }
    static async delete(data) {
        const identifier = data.identifier ?? this.make_intetifier(data);
        const oldData = await this.get(data);
        await this.pg.query("DELETE FROM record WHERE identifier = $1", [identifier]);
        this.emitter.emit("variableDelete", { data: oldData });
    }
    static async wipe() {
        await this.pg.exec("DELETE FROM record");
    }
    static async cdWipe() {
        await this.pg.exec("DELETE FROM cooldown");
    }
    static async cdAdd(data) {
        const identifier = this.make_cdIdentifier(data);
        const startedAt = Date.now().toString();
        await this.pg.query(`INSERT INTO cooldown (identifier, name, id, started_at, duration)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (identifier) DO UPDATE SET name = $2, id = $3, started_at = $4, duration = $5`, [identifier, data.name, data.id ?? null, startedAt, data.duration]);
    }
    static async cdDelete(identifier) {
        await this.pg.query("DELETE FROM cooldown WHERE identifier = $1", [identifier]);
    }
    static async cdTimeLeft(identifier) {
        const res = await this.pg.query("SELECT * FROM cooldown WHERE identifier = $1", [identifier]);
        const cd = rowToCooldown(res.rows[0]);
        if (!cd)
            return { left: 0 };
        return { ...cd, left: Math.max(cd.duration - (Date.now() - Number(cd.startedAt)), 0) };
    }
    static async query(query) {
        return await this.pg.query(query);
    }
}
exports.DataBase = DataBase;
//# sourceMappingURL=database.js.map