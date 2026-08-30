import { Cooldown, GuildData, IDataBaseOptions, MongoCooldown, MongoRecord, MySQLRecord, PostgreSQLRecord, RecordData, SQLiteRecord } from "./types"
import { DataSource } from "typeorm"
import { TypedEmitter } from "tiny-typed-emitter"
import { IDBEvents } from "../structures"
import { TransformEvents } from ".."
import "reflect-metadata"
import { DataBaseManager } from "./databaseManager"

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
}

type AnyRecord = typeof SQLiteRecord | typeof MongoRecord | typeof MySQLRecord | typeof PostgreSQLRecord
type AnyCooldown = typeof MongoCooldown | typeof Cooldown
export class DataBase extends DataBaseManager {
    public database = "db"
    public entityManager = {
        sqlite: [SQLiteRecord, Cooldown],
        mongodb: [MongoRecord, MongoCooldown],
        mysql: [MySQLRecord, Cooldown],
        postgres: [PostgreSQLRecord, Cooldown],
    }
    private static entities: {
        Record: typeof SQLiteRecord | typeof MySQLRecord | typeof PostgreSQLRecord | typeof MongoRecord
        Cooldown: typeof Cooldown | typeof MongoCooldown
    }

    private db: Promise<any>
    private static db: any
    private static emitter: TypedEmitter<TransformEvents<IDBEvents>>

    constructor(
        private emitter: TypedEmitter<TransformEvents<IDBEvents>>,
        options?: IDataBaseOptions
    ) {
        super(options ?? {type: "sqlite"})
        this.type = options?.type || "sqlite"
        this.db = this.getDB()
        const entityKey = (this.type === "better-sqlite3" || this.type === "surrealdb" || !(this.type in this.entityManager)) ? "sqlite" : this.type
        DataBase.entities = {
            Record: this.entityManager[entityKey][0] as AnyRecord,
            Cooldown: this.entityManager[entityKey][1] as AnyCooldown,
        }
    }

    public async init() {
        DataBase.emitter = this.emitter
        DataBase.db = await this.db
        DataBase.emitter.emit("connect")
    }

    public static make_intetifier(data: RecordData) {
        return `${data.type}_${data.name}_${isGuildData(data) ? data.guildId + "_" : ""}${data.id}`
    }

    public static async set(data: RecordData) {
        if (this.type === "surrealdb") {
            const identifier = this.make_intetifier(data)
            const newData: any = {
                identifier,
                name: data.name!,
                targetId: data.id,
                type: data.type!,
                value: data.value!,
            }
            if (isGuildData(data)) newData.guildId = data.guildId
            const oldData = await this.get(data)
            const eventData = { ...newData, id: data.id }
            if (oldData) {
                this.emitter.emit("variableUpdate", { newData: eventData, oldData })
            } else {
                this.emitter.emit("variableCreate", { data: eventData })
            }
            await this.db.query("UPSERT type::record('record', $id) MERGE $data;", {
                id: identifier,
                data: newData,
            })
            return
        }

        const newData = new this.entities.Record()
        newData.identifier = this.make_intetifier(data)
        newData.name = data.name!
        newData.id = data.id!
        newData.type = data.type!
        newData.value = data.value!
        if (isGuildData(data)) newData.guildId = data.guildId
        const oldData = (await this.db.getRepository(this.entities.Record).findOneBy({ identifier: this.make_intetifier(data) })) as SQLiteRecord
        if (oldData && this.type == "mongodb") {
            this.emitter.emit("variableUpdate", { newData, oldData })
            this.db.getRepository(this.entities.Record).update(oldData, newData)
        } else {
            oldData ? this.emitter.emit("variableUpdate", { newData, oldData }) : this.emitter.emit("variableCreate", { data: newData })
            await this.db.getRepository(this.entities.Record).save(newData)
        }
    }

    private static formatSurrealRecord(rec: any): SQLiteRecord {
        if (!rec) return rec
        return {
            ...rec,
            id: rec.targetId !== undefined ? rec.targetId : (rec.id && typeof rec.id === "object" ? rec.id.id : rec.id)
        }
    }

    public static async get(data: RecordData): Promise<SQLiteRecord | null> {
        const identifier = data.identifier ?? this.make_intetifier(data)
        if (this.type === "surrealdb") {
            const { RecordId } = require("surrealdb")
            try {
                const res = await this.db.select(new RecordId("record", identifier))
                return res ? this.formatSurrealRecord(res) : null
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return null
                throw err
            }
        }
        return await this.db.getRepository(this.entities.Record).findOneBy({ identifier })
    }

    public static async getAll(): Promise<SQLiteRecord[]> {
        if (this.type === "surrealdb") {
            try {
                const [records] = (await this.db.query("SELECT * FROM record;")) as [any[]]
                return (records ?? []).map((r) => this.formatSurrealRecord(r))
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return []
                throw err
            }
        }
        return await this.db.getRepository(this.entities.Record).find()
    }

    public static async find(data?: RecordData | any): Promise<SQLiteRecord[]> {
        if (this.type === "surrealdb") {
            let records: any[] = []
            try {
                const [res] = (await this.db.query("SELECT * FROM record;")) as [any[]]
                records = res ?? []
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return []
                throw err
            }
            const formatted = records.map((r) => this.formatSurrealRecord(r))
            if (!data || Object.keys(data).length === 0) return formatted
            return formatted.filter((rec) => {
                for (const [key, val] of Object.entries(data)) {
                    if (val === undefined) continue
                    if (val && typeof val === "object" && ("_type" in (val as any) || "value" in (val as any))) {
                        const pattern = (val as any)._value ?? (val as any).value
                        if (typeof pattern === "string") {
                            const target = String(rec[key as keyof SQLiteRecord] ?? "")
                            const regexStr = "^" + pattern.replace(/[%_]/g, (m) => (m === "%" ? ".*" : ".")) + "$"
                            if (!new RegExp(regexStr, "i").test(target)) return false
                        }
                    } else if (rec[key as keyof SQLiteRecord] !== val) {
                        return false
                    }
                }
                return true
            })
        }
        return await this.db.getRepository(this.entities.Record).find({
            where: { ...data },
        })
    }

    public static async delete(data: RecordData) {
        const identifier = data.identifier ?? this.make_intetifier(data)
        if (this.type === "surrealdb") {
            const oldData = await this.get(data)
            this.emitter.emit("variableDelete", { data: oldData })
            try {
                return await this.db.query("DELETE FROM record WHERE identifier = $id;", { id: identifier })
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return null
                throw err
            }
        }
        this.emitter.emit("variableDelete", { data: (await this.db.getRepository(this.entities.Record).findOneBy({ identifier })) as SQLiteRecord })
        return await this.db.getRepository(this.entities.Record).delete({ identifier })
    }

    public static async wipe() {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM record;")
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return null
                throw err
            }
        }
        return await this.db.getRepository(this.entities.Record).clear()
    }

    public static async cdWipe() {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM cooldown;")
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return null
                throw err
            }
        }
        return await this.db.getRepository(this.entities.Cooldown).clear()
    }

    public static make_cdIdentifier(data: { name?: string; id?: string }) {
        return `${data.name}${data.id ? "_" + data.id : ""}`
    }

    public static async cdAdd(data: { name: string; id?: string; duration: number }) {
        if (this.type === "surrealdb") {
            const identifier = this.make_cdIdentifier(data)
            const cd = {
                identifier,
                name: data.name,
                targetId: data.id,
                startedAt: Date.now(),
                duration: data.duration,
            }
            return await this.db.query("UPSERT type::record('cooldown', $id) MERGE $data;", {
                id: identifier,
                data: cd,
            })
        }

        const cd = new this.entities.Cooldown()
        cd.identifier = this.make_cdIdentifier(data)
        cd.name = data.name
        cd.id = data.id
        cd.startedAt = Date.now()
        cd.duration = data.duration

        const oldCD = await this.db.getRepository(this.entities.Cooldown).findOneBy({ identifier: this.make_cdIdentifier(data) })
        if (oldCD && this.type == "mongodb") return await this.db.getRepository(this.entities.Cooldown).update(oldCD, cd)
        else return await this.db.getRepository(this.entities.Cooldown).save(cd)
    }

    public static async cdDelete(identifier: string) {
        if (this.type === "surrealdb") {
            try {
                return await this.db.query("DELETE FROM cooldown WHERE identifier = $id;", { id: identifier })
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return null
                throw err
            }
        }
        await this.db.getRepository(this.entities.Cooldown).delete({ identifier })
    }

    public static async cdTimeLeft(identifier: string) {
        if (this.type === "surrealdb") {
            try {
                const [res] = (await this.db.query("SELECT * FROM cooldown WHERE identifier = $id LIMIT 1;", { id: identifier })) as [any[]]
                const data = res && res.length ? res[0] : null
                if (!data) return { left: 0 }
                return {
                    ...data,
                    id: data.targetId !== undefined ? data.targetId : (data.id && typeof data.id === "object" ? data.id.id : data.id),
                    left: Math.max(data.duration - (Date.now() - data.startedAt), 0)
                }
            } catch (err: any) {
                if (err?.kind === "NotFound" || err?.message?.includes("does not exist")) return { left: 0 }
                throw err
            }
        }
        const data = await this.db.getRepository(this.entities.Cooldown).findOneBy({ identifier })
        return data ? { ...data, left: Math.max(data.duration - (Date.now() - data.startedAt), 0) } : { left: 0 }
    }

    public static async query(query: string) {
        return await this.db.query(query)
    }
}
