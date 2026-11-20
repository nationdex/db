import { PGlite } from "@electric-sql/pglite";
function isGuildData(data) {
  return ["member", "channel", "role"].includes(data.type);
}
export function Like(pattern) {
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
    guildId: row.guild_id ?? undefined
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
    duration: Number(row.duration)
  };
}
function rowToSuggestion(row) {
  if (!row)
    return null;
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
    voteCount: Number(row.vote_count ?? 0)
  };
}

export class DataBase {
  emitter;
  options;
  static pg;
  static emitter;
  static ready = Promise.resolve();
  constructor(emitter, options) {
    this.emitter = emitter;
    this.options = options;
  }
  async init() {
    DataBase.emitter = this.emitter;
    DataBase.ready = this.connect();
    await DataBase.ready;
  }
  async connect() {
    DataBase.pg = new PGlite(this.options?.memory ? undefined : this.options?.folder ?? "database");
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
        `);
    DataBase.emitter.emit("connect");
  }
  static async close() {
    await this.ready;
    await this.pg.close();
  }
  static make_intetifier(data) {
    return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`;
  }
  static make_cdIdentifier(data) {
    return `${data.name}${data.id ? `_${data.id}` : ""}`;
  }
  static async set(data) {
    if (!data.name)
      throw new Error("DataBase.set: `name` is required");
    if (!data.type)
      throw new Error("DataBase.set: `type` is required");
    if (data.value === undefined)
      throw new Error("DataBase.set: `value` is required");
    await this.ready;
    const identifier = data.identifier ?? this.make_intetifier(data);
    const guildId = isGuildData(data) ? data.guildId ?? null : null;
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
    await this.ready;
    const identifier = data.identifier ?? this.make_intetifier(data);
    const res = await this.pg.query("SELECT * FROM record WHERE identifier = $1", [identifier]);
    return rowToRecord(res.rows[0]);
  }
  static async getAll() {
    await this.ready;
    const res = await this.pg.query("SELECT * FROM record");
    return res.rows.map(rowToRecord);
  }
  static async find(data) {
    await this.ready;
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
      } else if (isLike(value)) {
        params.push(value.pattern);
        conditions.push(`${column} LIKE $${params.length}`);
      } else {
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
    await this.ready;
    const identifier = data.identifier ?? this.make_intetifier(data);
    const oldData = await this.get(data);
    await this.pg.query("DELETE FROM record WHERE identifier = $1", [identifier]);
    this.emitter.emit("variableDelete", { data: oldData });
  }
  static async wipe() {
    await this.ready;
    await this.pg.exec("DELETE FROM record");
  }
  static async cdWipe() {
    await this.ready;
    await this.pg.exec("DELETE FROM cooldown");
  }
  static async cdAdd(data) {
    await this.ready;
    const identifier = this.make_cdIdentifier(data);
    const startedAt = Date.now().toString();
    await this.pg.query(`INSERT INTO cooldown (identifier, name, id, started_at, duration)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (identifier) DO UPDATE SET name = $2, id = $3, started_at = $4, duration = $5`, [identifier, data.name, data.id ?? null, startedAt, data.duration]);
  }
  static async cdDelete(identifier) {
    await this.ready;
    await this.pg.query("DELETE FROM cooldown WHERE identifier = $1", [identifier]);
  }
  static async cdTimeLeft(identifier) {
    await this.ready;
    const res = await this.pg.query("SELECT * FROM cooldown WHERE identifier = $1", [identifier]);
    const cd = rowToCooldown(res.rows[0]);
    if (!cd)
      return { left: 0 };
    return { ...cd, left: Math.max(cd.duration - (Date.now() - Number(cd.startedAt)), 0) };
  }
  static async query(query) {
    await this.ready;
    return await this.pg.query(query);
  }
  static SUGGESTION_SELECT = `
        SELECT s.*, COUNT(v.user_id) AS vote_count
        FROM suggestion s
        LEFT JOIN suggestion_vote v ON v.suggestion_id = s.id
    `;
  static async createSuggestion(data) {
    await this.ready;
    const res = await this.pg.query(`INSERT INTO suggestion (type, submitter_id, fields, image_url, alt_image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *, 0 AS vote_count`, [data.type, data.submitterId, JSON.stringify(data.fields), data.imageUrl ?? null, data.altImageUrl ?? null]);
    return rowToSuggestion(res.rows[0]);
  }
  static async getSuggestion(id) {
    await this.ready;
    const res = await this.pg.query(`${this.SUGGESTION_SELECT} WHERE s.id = $1 GROUP BY s.id`, [id]);
    return rowToSuggestion(res.rows[0]);
  }
  static async listSuggestions(filter = {}) {
    await this.ready;
    const conditions = [];
    const params = [];
    if (filter.type) {
      params.push(filter.type);
      conditions.push(`s.type = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`s.status = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const res = await this.pg.query(`${this.SUGGESTION_SELECT} ${where} GROUP BY s.id ORDER BY vote_count DESC, s.created_at ASC`, params);
    return res.rows.map(rowToSuggestion);
  }
  static async updateSuggestion(id, data) {
    await this.ready;
    const sets = ["updated_at = now()"];
    const params = [];
    if (data.status !== undefined) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
    }
    if (data.fields !== undefined) {
      params.push(JSON.stringify(data.fields));
      sets.push(`fields = $${params.length}`);
    }
    if (data.imageUrl !== undefined) {
      params.push(data.imageUrl);
      sets.push(`image_url = $${params.length}`);
    }
    if (data.altImageUrl !== undefined) {
      params.push(data.altImageUrl);
      sets.push(`alt_image_url = $${params.length}`);
    }
    if (data.messageId !== undefined) {
      params.push(data.messageId);
      sets.push(`message_id = $${params.length}`);
    }
    if (data.channelId !== undefined) {
      params.push(data.channelId);
      sets.push(`channel_id = $${params.length}`);
    }
    params.push(id);
    await this.pg.query(`UPDATE suggestion SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    return this.getSuggestion(id);
  }
  static async deleteSuggestion(id) {
    await this.ready;
    await this.pg.query("DELETE FROM suggestion WHERE id = $1", [id]);
  }
  static async addSuggestionVote(suggestionId, userId) {
    await this.ready;
    await this.pg.query("INSERT INTO suggestion_vote (suggestion_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [suggestionId, userId]);
  }
  static async removeSuggestionVote(suggestionId, userId) {
    await this.ready;
    await this.pg.query("DELETE FROM suggestion_vote WHERE suggestion_id = $1 AND user_id = $2", [suggestionId, userId]);
  }
  static async hasVotedSuggestion(suggestionId, userId) {
    await this.ready;
    const res = await this.pg.query("SELECT 1 FROM suggestion_vote WHERE suggestion_id = $1 AND user_id = $2", [suggestionId, userId]);
    return res.rows.length > 0;
  }
}
