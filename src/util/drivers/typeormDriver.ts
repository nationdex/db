import "reflect-metadata"
import { DataSource, type EntitySchema, type MixedList } from "typeorm"
import { DataBase } from "../database"
import { Cooldown, type GuildData, type IDataBaseOptions, MongoCooldown, MongoRecord, MySQLRecord, PostgreSQLRecord, type RecordData, SQLiteRecord } from "../types"
import type { DBEmitter, IDBDriver } from "./driver"

type AnyRecord = typeof SQLiteRecord | typeof MongoRecord | typeof MySQLRecord | typeof PostgreSQLRecord
type AnyCooldown = typeof MongoCooldown | typeof Cooldown

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
}

/**
 * TypeORM-backed driver for SQLite, MySQL, PostgreSQL, and MongoDB.
 *
 * This driver preserves the exact behaviour of the original `DataBase` /
 * `DataBaseManager` implementation, including the MongoDB-specific update
 * path (which fires `update()` without awaiting, to match the original
 * non-blocking semantics).
 *
 * The driver holds a single `DataSource` instance. The entity classes are
 * selected based on the configured backend type at construction time.
 */
export class TypeORMDriver implements IDBDriver {
    private readonly emitter: DBEmitter
    private readonly type: Exclude<IDataBaseOptions["type"], "surrealdb">
    private readonly databaseName: string

    private db!: DataSource
    private dbPromise: Promise<DataSource>

    private static activeDataBases: { name: string; db: DataSource }[] = []
    private static config: Exclude<IDataBaseOptions, { type: "surrealdb" }>

    private readonly entities: {
        Record: AnyRecord
        Cooldown: AnyCooldown
    }

    private readonly entityManager: {
        sqlite: MixedList<Function | string | EntitySchema>
        mongodb: MixedList<Function | string | EntitySchema>
        mysql: MixedList<Function | string | EntitySchema>
        postgres: MixedList<Function | string | EntitySchema>
    }

    constructor(emitter: DBEmitter, options: IDataBaseOptions) {
        this.emitter = emitter
        this.type = options.type as Exclude<IDataBaseOptions["type"], "surrealdb">
        this.databaseName = "forge.db"

        this.entityManager = {
            sqlite: [SQLiteRecord, Cooldown],
            mongodb: [MongoRecord, MongoCooldown],
            mysql: [MySQLRecord, Cooldown],
            postgres: [PostgreSQLRecord, Cooldown],
        }

        const lookupKey = this.type === "better-sqlite3" ? "sqlite" : this.type
        const entityList = this.entityManager[lookupKey] as unknown as [Function, Function]
        this.entities = {
            Record: entityList[0] as AnyRecord,
            Cooldown: entityList[1] as AnyCooldown,
        }

        if (!TypeORMDriver.config && options) {
            const opts = { ...options, type: options.type ?? "sqlite" }
            TypeORMDriver.config = opts as Exclude<IDataBaseOptions, { type: "surrealdb" }>
        }

        this.dbPromise = this.getDB()
    }

    async init(): Promise<void> {
        this.db = await this.dbPromise
    }

    private async getDB(): Promise<DataSource> {
        await this.waitForConfig()
        const check = TypeORMDriver.activeDataBases.find((s) => s.name === this.databaseName)
        if (check?.name === this.databaseName) return check.db

        const data = { ...TypeORMDriver.config } as Exclude<IDataBaseOptions, { type: "surrealdb" }>
        let db: DataSource
        switch (data.type) {
            case "mysql":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.mysql,
                    synchronize: true,
                })
                break
            case "postgres":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.postgres,
                    synchronize: true,
                })
                break
            case "mongodb":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.mongodb,
                    synchronize: true,
                })
                break
            default:
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.sqlite,
                    synchronize: true,
                    database: `${data.folder ?? "database"}/${this.databaseName}`,
                })
                break
        }
        db = await db.initialize()
        TypeORMDriver.activeDataBases.push({ name: this.databaseName, db })
        return db
    }

    private waitForConfig(): Promise<IDataBaseOptions> {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (TypeORMDriver.config) {
                    clearInterval(check)
                    resolve(TypeORMDriver.config)
                }
            }, 50)
            setTimeout(() => {
                clearInterval(check)
                if (!TypeORMDriver.config) {
                    throw new Error("Unable to resolve ForgeDB extension configuration. Dependent packages failed to initialize.")
                }
            }, 10_000)
        })
    }

    async set(data: RecordData): Promise<void> {
        const newData = new this.entities.Record()
        newData.identifier = DataBase.make_intetifier(data)
        newData.name = data.name!
        newData.id = data.id!
        newData.type = data.type!
        newData.value = data.value!
        if (isGuildData(data)) newData.guildId = data.guildId

        const oldData = (await this.db.getRepository(this.entities.Record).findOneBy({
            identifier: DataBase.make_intetifier(data),
        })) as SQLiteRecord

        if (oldData && this.type === "mongodb") {
            this.emitter.emit("variableUpdate", { newData, oldData })
            this.db.getRepository(this.entities.Record).update(oldData, newData)
        } else {
            oldData ? this.emitter.emit("variableUpdate", { newData, oldData }) : this.emitter.emit("variableCreate", { data: newData })
            await this.db.getRepository(this.entities.Record).save(newData)
        }
    }

    async get(data: RecordData): Promise<SQLiteRecord | null> {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        return await this.db.getRepository(this.entities.Record).findOneBy({ identifier })
    }

    async getAll(): Promise<SQLiteRecord[]> {
        return await this.db.getRepository(this.entities.Record).find()
    }

    async find(data?: RecordData): Promise<SQLiteRecord[]> {
        return await this.db.getRepository(this.entities.Record).find({
            where: { ...data },
        })
    }

    async delete(data: RecordData): Promise<void> {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        this.emitter.emit("variableDelete", {
            data: (await this.db.getRepository(this.entities.Record).findOneBy({ identifier })) as SQLiteRecord,
        })
        await this.db.getRepository(this.entities.Record).delete({ identifier })
    }

    async wipe(): Promise<void> {
        await this.db.getRepository(this.entities.Record).clear()
    }

    async importRecords(records: RecordData[]): Promise<number> {
        let count = 0
        for (const data of records) {
            const newData = new this.entities.Record()
            newData.identifier = DataBase.make_intetifier(data)
            newData.name = data.name!
            newData.id = data.id!
            newData.type = data.type!
            newData.value = data.value!
            if (isGuildData(data)) newData.guildId = data.guildId
            await this.db.getRepository(this.entities.Record).save(newData)
            count++
        }
        return count
    }

    async cdWipe(): Promise<void> {
        await this.db.getRepository(this.entities.Cooldown).clear()
    }

    async cdAdd(data: { name: string; id?: string; duration: number }): Promise<void> {
        const cd = new this.entities.Cooldown()
        cd.identifier = DataBase.make_cdIdentifier(data)
        cd.name = data.name
        cd.id = data.id
        cd.startedAt = Date.now()
        cd.duration = data.duration

        const oldCD = await this.db.getRepository(this.entities.Cooldown).findOneBy({
            identifier: DataBase.make_cdIdentifier(data),
        })
        if (oldCD && this.type === "mongodb") {
            await this.db.getRepository(this.entities.Cooldown).update(oldCD, cd)
        } else {
            await this.db.getRepository(this.entities.Cooldown).save(cd)
        }
    }

    async cdDelete(identifier: string): Promise<void> {
        await this.db.getRepository(this.entities.Cooldown).delete({ identifier })
    }

    async cdTimeLeft(identifier: string) {
        const data = await this.db.getRepository(this.entities.Cooldown).findOneBy({ identifier })
        return data ? { ...data, left: Math.max(data.duration - (Date.now() - data.startedAt), 0) } : { left: 0 }
    }

    async query(q: string): Promise<unknown> {
        return await this.db.query(q)
    }

    async ping(): Promise<unknown> {
        return await this.db.query("SELECT 1")
    }
}
