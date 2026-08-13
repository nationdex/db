"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeORMDriver = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const database_1 = require("../database");
const types_1 = require("../types");
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
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
class TypeORMDriver {
    emitter;
    type;
    databaseName;
    db;
    dbPromise;
    static activeDataBases = [];
    static config;
    entities;
    entityManager;
    constructor(emitter, options) {
        this.emitter = emitter;
        this.type = options.type;
        this.databaseName = "forge.db";
        this.entityManager = {
            sqlite: [types_1.SQLiteRecord, types_1.Cooldown],
            mongodb: [types_1.MongoRecord, types_1.MongoCooldown],
            mysql: [types_1.MySQLRecord, types_1.Cooldown],
            postgres: [types_1.PostgreSQLRecord, types_1.Cooldown],
        };
        const lookupKey = this.type === "better-sqlite3" ? "sqlite" : this.type;
        const entityList = this.entityManager[lookupKey];
        this.entities = {
            Record: entityList[0],
            Cooldown: entityList[1],
        };
        if (!TypeORMDriver.config && options) {
            const opts = { ...options, type: options.type ?? "sqlite" };
            TypeORMDriver.config = opts;
        }
        this.dbPromise = this.getDB();
    }
    async init() {
        this.db = await this.dbPromise;
    }
    async getDB() {
        await this.waitForConfig();
        const check = TypeORMDriver.activeDataBases.find((s) => s.name === this.databaseName);
        if (check?.name === this.databaseName)
            return check.db;
        const data = { ...TypeORMDriver.config };
        let db;
        switch (data.type) {
            case "mysql":
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.mysql,
                    synchronize: true,
                });
                break;
            case "postgres":
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.postgres,
                    synchronize: true,
                });
                break;
            case "mongodb":
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.mongodb,
                    synchronize: true,
                });
                break;
            default:
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.sqlite,
                    synchronize: true,
                    database: `${data.folder ?? "database"}/${this.databaseName}`,
                });
                break;
        }
        db = await db.initialize();
        TypeORMDriver.activeDataBases.push({ name: this.databaseName, db });
        return db;
    }
    waitForConfig() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (TypeORMDriver.config) {
                    clearInterval(check);
                    resolve(TypeORMDriver.config);
                }
            }, 50);
            setTimeout(() => {
                clearInterval(check);
                if (!TypeORMDriver.config) {
                    throw new Error("Unable to resolve ForgeDB extension configuration. Dependent packages failed to initialize.");
                }
            }, 10_000);
        });
    }
    async set(data) {
        const newData = new this.entities.Record();
        newData.identifier = database_1.DataBase.make_intetifier(data);
        newData.name = data.name;
        newData.id = data.id;
        newData.type = data.type;
        newData.value = data.value;
        if (isGuildData(data))
            newData.guildId = data.guildId;
        const oldData = (await this.db.getRepository(this.entities.Record).findOneBy({
            identifier: database_1.DataBase.make_intetifier(data),
        }));
        if (oldData && this.type === "mongodb") {
            this.emitter.emit("variableUpdate", { newData, oldData });
            this.db.getRepository(this.entities.Record).update(oldData, newData);
        }
        else {
            oldData ? this.emitter.emit("variableUpdate", { newData, oldData }) : this.emitter.emit("variableCreate", { data: newData });
            await this.db.getRepository(this.entities.Record).save(newData);
        }
    }
    async get(data) {
        const identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
        return await this.db.getRepository(this.entities.Record).findOneBy({ identifier });
    }
    async getAll() {
        return await this.db.getRepository(this.entities.Record).find();
    }
    async find(data) {
        return await this.db.getRepository(this.entities.Record).find({
            where: { ...data },
        });
    }
    async delete(data) {
        const identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
        this.emitter.emit("variableDelete", {
            data: (await this.db.getRepository(this.entities.Record).findOneBy({ identifier })),
        });
        await this.db.getRepository(this.entities.Record).delete({ identifier });
    }
    async wipe() {
        await this.db.getRepository(this.entities.Record).clear();
    }
    async cdWipe() {
        await this.db.getRepository(this.entities.Cooldown).clear();
    }
    async cdAdd(data) {
        const cd = new this.entities.Cooldown();
        cd.identifier = database_1.DataBase.make_cdIdentifier(data);
        cd.name = data.name;
        cd.id = data.id;
        cd.startedAt = Date.now();
        cd.duration = data.duration;
        const oldCD = await this.db.getRepository(this.entities.Cooldown).findOneBy({
            identifier: database_1.DataBase.make_cdIdentifier(data),
        });
        if (oldCD && this.type === "mongodb") {
            await this.db.getRepository(this.entities.Cooldown).update(oldCD, cd);
        }
        else {
            await this.db.getRepository(this.entities.Cooldown).save(cd);
        }
    }
    async cdDelete(identifier) {
        await this.db.getRepository(this.entities.Cooldown).delete({ identifier });
    }
    async cdTimeLeft(identifier) {
        const data = await this.db.getRepository(this.entities.Cooldown).findOneBy({ identifier });
        return data ? { ...data, left: Math.max(data.duration - (Date.now() - data.startedAt), 0) } : { left: 0 };
    }
    async query(q) {
        return await this.db.query(q);
    }
    async ping() {
        return await this.db.query("SELECT 1");
    }
}
exports.TypeORMDriver = TypeORMDriver;
//# sourceMappingURL=typeormDriver.js.map