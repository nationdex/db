import { PGlite } from "@electric-sql/pglite"
import type { EventEmitter } from "node:events"
import type { IDBEvents } from "../structures"
import type {
    CooldownRecord,
    DBRecord,
    GuildData,
    IDataBaseOptions,
    RecordData,
    SuggestionData,
    SuggestionRecord,
    SuggestionUpdateData,
} from "./types"

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
}

/** Marker produced by `Like()` so `DataBase.find` can build a SQL `LIKE` condition instead of an equality check. */
export interface LikeCondition {
    __like: true
    pattern: string
}

export function Like(pattern: string): LikeCondition {
    return { __like: true, pattern }
}

function isLike(value: unknown): value is LikeCondition {
    return typeof value === "object" && value !== null && (value as LikeCondition).__like === true
}

const COLUMN_MAP: Record<string, string> = { guildId: "guild_id" }
const RECORD_COLUMNS = new Set(["identifier", "name", "id", "type", "value", "guild_id"])

function rowToRecord(row: any): DBRecord | null {
    if (!row) return null
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.id ?? undefined,
        type: row.type,
        value: row.value,
        guildId: row.guild_id ?? undefined,
    }
}

function rowToCooldown(row: any): CooldownRecord | null {
    if (!row) return null
    return {
        identifier: row.identifier,
        name: row.name,
        id: row.id ?? undefined,
        startedAt: row.started_at,
        duration: Number(row.duration),
    }
}

function rowToSuggestion(row: any): SuggestionRecord | null {
    if (!row) return null
    return {
        id: Number(row.id),
        type: row.type,
        submitterId: row.submitter_id,
        status: row.status,
        fields: typeof row.fields === "string" ? JSON.parse(row.fields) : row.fields,
        imageUrl: row.image_url ?? undefined,
        altImageUrl: row.alt_image_url ?? undefined,
        messageId: row.message_id ?? undefined,
        channelId: row.channel_id ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        voteCount: Number(row.vote_count ?? 0),
    }
}

/**
 * Static facade backed by an embedded PGlite (WASM Postgres) instance.
 *
 * All 70+ function files in `src/functions/` call these statics exclusively.
 */
export class DataBase {
    private static pg: PGlite
    private static emitter: EventEmitter<IDBEvents>

    /**
     * Resolves once PGlite has booted and the schema exists. Every other static
     * method awaits this first, so callers can never observe `pg` before it's set —
     * closing the race between `ForgeExtension.init()` (synchronous, framework-invoked,
     * can't be awaited) and the first ForgeScript function that touches the database.
     */
    private static ready: Promise<void> = Promise.resolve()

    constructor(
        private emitter: EventEmitter<IDBEvents>,
        private options?: IDataBaseOptions
    ) {}

    public async init() {
        DataBase.emitter = this.emitter
        DataBase.ready = this.connect()
        await DataBase.ready
    }

    private async connect() {
        DataBase.pg = new PGlite(this.options?.memory ? undefined : (this.options?.folder ?? "database"))
        await DataBase.pg.waitReady

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
            CREATE TABLE IF NOT EXISTS suggestion (
                id SERIAL PRIMARY KEY,
                type TEXT NOT NULL,
                submitter_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                fields JSONB NOT NULL,
                image_url TEXT,
                alt_image_url TEXT,
                message_id TEXT,
                channel_id TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS suggestion_vote (
                suggestion_id INTEGER NOT NULL REFERENCES suggestion(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                PRIMARY KEY (suggestion_id, user_id)
            );
        `)

        DataBase.emitter.emit("connect")
    }

    /** Flushes and closes the underlying PGlite instance. Call this from your own shutdown path. */
    public static async close() {
        await this.ready
        await this.pg.close()
    }

    public static make_intetifier(data: RecordData) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`
    }

    public static make_cdIdentifier(data: { name?: string; id?: string }) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`
    }

    public static async set(data: RecordData) {
        if (!data.name) throw new Error("DataBase.set: `name` is required")
        if (!data.type) throw new Error("DataBase.set: `type` is required")
        if (data.value === undefined) throw new Error("DataBase.set: `value` is required")

        await this.ready
        const identifier = data.identifier ?? this.make_intetifier(data)
        const guildId = isGuildData(data) ? (data.guildId ?? null) : null

        const oldData = await this.get(data)
        await this.pg.query(
            `INSERT INTO record (identifier, name, id, type, value, guild_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (identifier) DO UPDATE SET name = $2, id = $3, type = $4, value = $5, guild_id = $6`,
            [identifier, data.name, data.id ?? null, data.type, data.value, guildId]
        )

        const newData = rowToRecord({ identifier, name: data.name, id: data.id, type: data.type, value: data.value, guild_id: guildId })
        if (oldData) this.emitter.emit("variableUpdate", { newData, oldData })
        else this.emitter.emit("variableCreate", { data: newData })
    }

    public static async get(data: RecordData): Promise<DBRecord | null> {
        await this.ready
        const identifier = data.identifier ?? this.make_intetifier(data)
        const res = await this.pg.query<any>("SELECT * FROM record WHERE identifier = $1", [identifier])
        return rowToRecord(res.rows[0])
    }

    public static async getAll(): Promise<DBRecord[]> {
        await this.ready
        const res = await this.pg.query<any>("SELECT * FROM record")
        return res.rows.map(rowToRecord) as DBRecord[]
    }

    public static async find(data?: Record<string, unknown>): Promise<DBRecord[]> {
        await this.ready
        if (!data || Object.keys(data).length === 0) return this.getAll()

        const conditions: string[] = []
        const params: unknown[] = []
        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue
            const column = COLUMN_MAP[key] ?? key
            if (!RECORD_COLUMNS.has(column)) continue
            if (value === null) {
                conditions.push(`${column} IS NULL`)
            } else if (isLike(value)) {
                params.push(value.pattern)
                conditions.push(`${column} LIKE $${params.length}`)
            } else {
                params.push(value)
                conditions.push(`${column} = $${params.length}`)
            }
        }
        if (conditions.length === 0) return this.getAll()

        const res = await this.pg.query<any>(`SELECT * FROM record WHERE ${conditions.join(" AND ")}`, params)
        return res.rows.map(rowToRecord) as DBRecord[]
    }

    public static async delete(data: RecordData) {
        await this.ready
        const identifier = data.identifier ?? this.make_intetifier(data)
        const oldData = await this.get(data)
        await this.pg.query("DELETE FROM record WHERE identifier = $1", [identifier])
        this.emitter.emit("variableDelete", { data: oldData })
    }

    public static async wipe() {
        await this.ready
        await this.pg.exec("DELETE FROM record")
    }

    public static async cdWipe() {
        await this.ready
        await this.pg.exec("DELETE FROM cooldown")
    }

    public static async cdAdd(data: { name: string; id?: string; duration: number }) {
        await this.ready
        const identifier = this.make_cdIdentifier(data)
        const startedAt = Date.now().toString()
        await this.pg.query(
            `INSERT INTO cooldown (identifier, name, id, started_at, duration)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (identifier) DO UPDATE SET name = $2, id = $3, started_at = $4, duration = $5`,
            [identifier, data.name, data.id ?? null, startedAt, data.duration]
        )
    }

    public static async cdDelete(identifier: string) {
        await this.ready
        await this.pg.query("DELETE FROM cooldown WHERE identifier = $1", [identifier])
    }

    public static async cdTimeLeft(identifier: string) {
        await this.ready
        const res = await this.pg.query<any>("SELECT * FROM cooldown WHERE identifier = $1", [identifier])
        const cd = rowToCooldown(res.rows[0])
        if (!cd) return { left: 0 }
        return { ...cd, left: Math.max(cd.duration - (Date.now() - Number(cd.startedAt)), 0) }
    }

    public static async query(query: string) {
        await this.ready
        return await this.pg.query(query)
    }

    private static readonly SUGGESTION_SELECT = `
        SELECT s.*, COUNT(v.user_id) AS vote_count
        FROM suggestion s
        LEFT JOIN suggestion_vote v ON v.suggestion_id = s.id
    `

    public static async createSuggestion(data: SuggestionData): Promise<SuggestionRecord> {
        await this.ready
        const res = await this.pg.query<any>(
            `INSERT INTO suggestion (type, submitter_id, fields, image_url, alt_image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *, 0 AS vote_count`,
            [data.type, data.submitterId, JSON.stringify(data.fields), data.imageUrl ?? null, data.altImageUrl ?? null]
        )
        return rowToSuggestion(res.rows[0])!
    }

    public static async getSuggestion(id: number): Promise<SuggestionRecord | null> {
        await this.ready
        const res = await this.pg.query<any>(`${this.SUGGESTION_SELECT} WHERE s.id = $1 GROUP BY s.id`, [id])
        return rowToSuggestion(res.rows[0])
    }

    public static async listSuggestions(filter: { type?: string; status?: string } = {}): Promise<SuggestionRecord[]> {
        await this.ready
        const conditions: string[] = []
        const params: unknown[] = []
        if (filter.type) {
            params.push(filter.type)
            conditions.push(`s.type = $${params.length}`)
        }
        if (filter.status) {
            params.push(filter.status)
            conditions.push(`s.status = $${params.length}`)
        }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
        const res = await this.pg.query<any>(
            `${this.SUGGESTION_SELECT} ${where} GROUP BY s.id ORDER BY vote_count DESC, s.created_at ASC`,
            params
        )
        return res.rows.map(rowToSuggestion) as SuggestionRecord[]
    }

    public static async getSuggestionStats(submitterId: string) {
        await this.ready
        const result = await this.pg.query<{ open_count: number; latest_submission_at: number | null }>(
            `SELECT count(*) FILTER (WHERE status IN ('pending', 'changes_requested'))::int AS open_count,
                    floor(extract(epoch FROM max(created_at)) * 1000)::double precision AS latest_submission_at
             FROM suggestion WHERE submitter_id = $1`,
            [submitterId]
        )
        const row = result.rows[0]
        return { openCount: row.open_count, latestSubmissionAt: row.latest_submission_at }
    }

    public static async updateSuggestion(id: number, data: SuggestionUpdateData): Promise<SuggestionRecord | null> {
        await this.ready
        const sets: string[] = ["updated_at = now()"]
        const params: unknown[] = []
        if (data.status !== undefined) {
            params.push(data.status)
            sets.push(`status = $${params.length}`)
        }
        if (data.fields !== undefined) {
            params.push(JSON.stringify(data.fields))
            sets.push(`fields = $${params.length}`)
        }
        if (data.imageUrl !== undefined) {
            params.push(data.imageUrl)
            sets.push(`image_url = $${params.length}`)
        }
        if (data.altImageUrl !== undefined) {
            params.push(data.altImageUrl)
            sets.push(`alt_image_url = $${params.length}`)
        }
        if (data.messageId !== undefined) {
            params.push(data.messageId)
            sets.push(`message_id = $${params.length}`)
        }
        if (data.channelId !== undefined) {
            params.push(data.channelId)
            sets.push(`channel_id = $${params.length}`)
        }
        params.push(id)
        await this.pg.query(`UPDATE suggestion SET ${sets.join(", ")} WHERE id = $${params.length}`, params)
        return this.getSuggestion(id)
    }

    public static async deleteSuggestion(id: number) {
        await this.ready
        await this.pg.query("DELETE FROM suggestion WHERE id = $1", [id])
    }

    public static async addSuggestionVote(suggestionId: number, userId: string) {
        await this.ready
        await this.pg.query(
            "INSERT INTO suggestion_vote (suggestion_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [suggestionId, userId]
        )
    }

    public static async removeSuggestionVote(suggestionId: number, userId: string) {
        await this.ready
        await this.pg.query("DELETE FROM suggestion_vote WHERE suggestion_id = $1 AND user_id = $2", [suggestionId, userId])
    }

    public static async hasVotedSuggestion(suggestionId: number, userId: string): Promise<boolean> {
        await this.ready
        const res = await this.pg.query<any>(
            "SELECT 1 FROM suggestion_vote WHERE suggestion_id = $1 AND user_id = $2",
            [suggestionId, userId]
        )
        return res.rows.length > 0
    }
}
