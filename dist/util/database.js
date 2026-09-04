"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = void 0;
const types_1 = require("./types");
require("reflect-metadata");
const databaseManager_1 = require("./databaseManager");
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
}
class DataBase extends databaseManager_1.DataBaseManager {
    emitter;
    database = "db";
    entityManager = {
        mysql: [types_1.MySQLRecord, types_1.Cooldown],
        postgres: [types_1.PostgreSQLRecord, types_1.Cooldown],
    };
    static entities;
    db;
    static db;
    static emitter;
    constructor(emitter, options) {
        super(options ?? { type: "surrealdb" });
        this.emitter = emitter;
        this.type = options?.type || "surrealdb";
        this.db = this.getDB();
        const entityKey = (this.type === "mysql" || this.type === "postgres") ? this.type : "mysql";
        DataBase.entities = {
            Record: this.entityManager[entityKey][0],
            Cooldown: this.entityManager[entityKey][1],
        };
    }
    async init() {
        DataBase.emitter = this.emitter;
        DataBase.db = await this.db;
        DataBase.emitter.emit("connect");
    }
    static make_intetifier(data) {
        return `${data.type}_${data.name}_${isGuildData(data) ? data.guildId + "_" : ""}${data.id}`;
    }
    static async set(data) {
        if (this.type === "surrealdb") {
            const identifier = this.make_intetifier(data);
            const newData = {
                identifier,
                name: data.name,
                targetId: data.id,
                type: data.type,
                value: data.value,
            };
            if (isGuildData(data))
                newData.guildId = data.guildId;
            const oldData = await this.get(data);
            const eventData = { ...newData, id: data.id };
            if (oldData) {
                this.emitter.emit("variableUpdate", { newData: eventData, oldData });
            }
            else {
                this.emitter.emit("variableCreate", { data: eventData });
            }
            await this.db.query("UPSERT type::thing('record', $id) MERGE $data;", {
                id: identifier,
                data: newData,
            });
            return;
        }
        const newData = new this.entities.Record();
        newData.identifier = this.make_intetifier(data);
        newData.name = data.name;
        newData.id = data.id;
        newData.type = data.type;
        newData.value = data.value;
        if (isGuildData(data))
            newData.guildId = data.guildId;
        const oldData = (await this.db.getRepository(this.entities.Record).findOneBy({ identifier: this.make_intetifier(data) }));
        oldData ? this.emitter.emit("variableUpdate", { newData, oldData }) : this.emitter.emit("variableCreate", { data: newData });
        await this.db.getRepository(this.entities.Record).save(newData);
    }
    static formatSurrealRecord(rec) {
        if (!rec)
            return rec;
        return {
            ...rec,
            id: rec.targetId !== undefined ? rec.targetId : (rec.id && typeof rec.id === "object" ? rec.id.id : rec.id)
        };
    }
    static async get(data) {
        const identifier = data.identifier ?? this.make_intetifier(data);
        if (this.type === "surrealdb") {
            const { RecordId } = require("surrealdb");
            try {
                const res = await this.db.select(new RecordId("record", identifier));
                return res ? this.formatSurrealRecord(res) : null;
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return null;
                throw err;
            }
        }
        return await this.db.getRepository(this.entities.Record).findOneBy({ identifier });
    }
    static async getAll() {
        if (this.type === "surrealdb") {
            try {
                const [records] = (await this.db.query("SELECT * FROM record;"));
                return (records ?? []).map((r) => this.formatSurrealRecord(r));
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return [];
                throw err;
            }
        }
        return await this.db.getRepository(this.entities.Record).find();
    }
    static async find(data) {
        if (this.type === "surrealdb") {
            let records = [];
            try {
                const [res] = (await this.db.query("SELECT * FROM record;"));
                records = res ?? [];
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return [];
                throw err;
            }
            const formatted = records.map((r) => this.formatSurrealRecord(r));
            if (!data || Object.keys(data).length === 0)
                return formatted;
            return formatted.filter((rec) => {
                for (const [key, val] of Object.entries(data)) {
                    if (val === undefined)
                        continue;
                    if (val && typeof val === "object" && ("_type" in val || "value" in val)) {
                        const pattern = val._value ?? val.value;
                        if (typeof pattern === "string") {
                            const target = String(rec[key] ?? "");
                            const regexStr = "^" + pattern.replace(/[%_]/g, (m) => (m === "%" ? ".*" : ".")) + "$";
                            if (!new RegExp(regexStr, "i").test(target))
                                return false;
                        }
                    }
                    else if (rec[key] !== val) {
                        return false;
                    }
                }
                return true;
            });
        }
        return await this.db.getRepository(this.entities.Record).find({
            where: { ...data },
        });
    }
    static async delete(data) {
        const identifier = data.identifier ?? this.make_intetifier(data);
        if (this.type === "surrealdb") {
            const oldData = await this.get(data);
            this.emitter.emit("variableDelete", { data: oldData });
            try {
                return await this.db.query("DELETE FROM record WHERE identifier = $id;", { id: identifier });
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return null;
                throw err;
            }
        }
        this.emitter.emit("variableDelete", { data: (await this.db.getRepository(this.entities.Record).findOneBy({ identifier })) });
        return await this.db.getRepository(this.entities.Record).delete({ identifier });
    }
    static async wipe() {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM record;");
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return null;
                throw err;
            }
        }
        return await this.db.getRepository(this.entities.Record).clear();
    }
    static async cdWipe() {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM cooldown;");
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return null;
                throw err;
            }
        }
        return await this.db.getRepository(this.entities.Cooldown).clear();
    }
    static make_cdIdentifier(data) {
        return `${data.name}${data.id ? "_" + data.id : ""}`;
    }
    static async cdAdd(data) {
        if (this.type === "surrealdb") {
            const identifier = this.make_cdIdentifier(data);
            const cd = {
                identifier,
                name: data.name,
                targetId: data.id,
                startedAt: Date.now().toString(),
                duration: data.duration,
            };
            return await this.db.query("UPSERT type::thing('cooldown', $id) MERGE $data;", {
                id: identifier,
                data: cd,
            });
        }
        const cd = new this.entities.Cooldown();
        cd.identifier = this.make_cdIdentifier(data);
        cd.name = data.name;
        cd.id = data.id;
        cd.startedAt = Date.now().toString();
        cd.duration = data.duration;
        return await this.db.getRepository(this.entities.Cooldown).save(cd);
    }
    static async cdDelete(identifier) {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM cooldown WHERE identifier = $id;", { id: identifier });
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return null;
                throw err;
            }
        }
        await this.db.getRepository(this.entities.Cooldown).delete({ identifier });
    }
    static async cdTimeLeft(identifier) {
        if (this.type === "surrealdb") {
            try {
                const [res] = (await this.db.query("SELECT * FROM cooldown WHERE identifier = $id LIMIT 1;", { id: identifier }));
                const data = res && res.length ? res[0] : null;
                if (!data)
                    return { left: 0 };
                const startedAt = Number(data.startedAt);
                return {
                    ...data,
                    id: data.targetId !== undefined ? data.targetId : (data.id && typeof data.id === "object" ? data.id.id : data.id),
                    left: Math.max(data.duration - (Date.now() - startedAt), 0)
                };
            }
            catch (err) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist"))
                    return { left: 0 };
                throw err;
            }
        }
        const data = await this.db.getRepository(this.entities.Cooldown).findOneBy({ identifier });
        if (!data)
            return { left: 0 };
        const startedAt = Number(data.startedAt);
        return { ...data, left: Math.max(data.duration - (Date.now() - startedAt), 0) };
    }
    static async query(query) {
        return await this.db.query(query);
    }
}
exports.DataBase = DataBase;
//# sourceMappingURL=database.js.map