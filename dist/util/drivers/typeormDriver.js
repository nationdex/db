"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeORMDriver = void 0;
const node_path_1 = __importDefault(require("node:path"));
const typeorm_1 = require("typeorm");
const database_1 = require("../database");
const resolver_1 = require("../resolver");
const types_1 = require("../types");
(0, resolver_1.patchBunMkdir)();
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
            case "mysql": {
                const driver = (0, resolver_1.resolveModule)("mysql2", data.driver) ?? (0, resolver_1.resolveModule)("mysql", data.driver);
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.mysql,
                    synchronize: true,
                    ...(driver ? { driver } : {}),
                });
                break;
            }
            case "postgres": {
                const driver = (0, resolver_1.resolveModule)("pg", data.driver);
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.postgres,
                    synchronize: true,
                    ...(driver ? { driver } : {}),
                });
                break;
            }
            case "mongodb": {
                const driver = (0, resolver_1.resolveModule)("mongodb", data.driver);
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.mongodb,
                    synchronize: true,
                    ...(driver ? { driver } : {}),
                });
                break;
            }
            case "better-sqlite3": {
                const driver = (0, resolver_1.resolveModule)("better-sqlite3", data.driver);
                const dbPath = node_path_1.default.resolve(data.folder ?? "database", this.databaseName);
                db = new typeorm_1.DataSource({
                    ...data,
                    type: "better-sqlite3",
                    entities: this.entityManager.sqlite,
                    synchronize: true,
                    database: dbPath,
                    ...(driver ? { driver } : {}),
                });
                break;
            }
            default: {
                const driver = (0, resolver_1.resolveModule)("sqlite3", data.driver);
                const dbPath = node_path_1.default.resolve(data.folder ?? "database", this.databaseName);
                db = new typeorm_1.DataSource({
                    ...data,
                    type: "sqlite",
                    entities: this.entityManager.sqlite,
                    synchronize: true,
                    database: dbPath,
                    ...(driver ? { driver } : {}),
                });
                break;
            }
        }
        try {
            db = await db.initialize();
        }
        catch (err) {
            const driverHints = {
                sqlite: "sqlite3",
                "better-sqlite3": "better-sqlite3",
                mysql: "mysql2",
                postgres: "pg",
                mongodb: "mongodb",
            };
            const expectedPkg = driverHints[data.type ?? "sqlite"];
            if (err?.name === "DriverPackageNotInstalledError" || err?.message?.includes("package has not been found installed")) {
                throw new Error(`ForgeDB (${data.type ?? "sqlite"}): The database driver package "${expectedPkg}" is not found or failed to load.\n` +
                    `Install it with:\n` +
                    `  • pnpm:  pnpm add ${expectedPkg}\n` +
                    `  • bun:   bun add ${expectedPkg}\n` +
                    `  • npm:   npm i ${expectedPkg}\n` +
                    `Original error: ${err.message}`);
            }
            throw err;
        }
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
        const identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
        const newData = new this.entities.Record();
        newData.identifier = identifier;
        newData.name = data.name;
        newData.id = data.id;
        newData.type = data.type;
        newData.value = data.value;
        if (isGuildData(data) && data.guildId)
            newData.guildId = data.guildId;
        const oldData = (await this.db.getRepository(this.entities.Record).findOneBy({
            identifier,
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
    async importRecords(records) {
        const CHUNK_SIZE = 250;
        const repo = this.db.getRepository(this.entities.Record);
        let count = 0;
        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
            const chunk = records.slice(i, i + CHUNK_SIZE);
            const entities = chunk.map((data) => {
                const entity = new this.entities.Record();
                entity.identifier = data.identifier ?? database_1.DataBase.make_intetifier(data);
                entity.name = data.name;
                entity.id = data.id;
                entity.type = data.type;
                // Ensure value is always a string.
                entity.value =
                    data.value !== null && data.value !== undefined
                        ? typeof data.value === "object"
                            ? JSON.stringify(data.value)
                            : String(data.value)
                        : "";
                if (isGuildData(data) && data.guildId)
                    entity.guildId = data.guildId;
                return entity;
            });
            await repo.save(entities);
            count += entities.length;
        }
        return count;
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