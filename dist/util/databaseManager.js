"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBaseManager = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const activeDataBases = [];
let config;
class DataBaseManager {
    type;
    static type;
    constructor(options) {
        if (!config && options) {
            options.type = options.type ?? "surrealdb";
            config = options;
        }
    }
    async getDB() {
        await this.waitForConfig();
        this.type = config.type;
        DataBaseManager.type = this.type;
        const check = activeDataBases.find((s) => s.name === this.database);
        if (check) return check.db;
        const data = { ...config };
        let db;
        switch (data.type) {
            case "surrealdb": {
                const { Surreal, createRemoteEngines } = require("surrealdb");
                let engines = {};
                try {
                    const { createNodeEngines } = await (Function('return import("@surrealdb/node")')());
                    if (createNodeEngines)
                        engines = { ...engines, ...createNodeEngines() };
                }
                catch { }
                try {
                    if (typeof createRemoteEngines === "function") {
                        engines = { ...engines, ...createRemoteEngines() };
                    }
                }
                catch { }
                const surreal = new Surreal({ engines });
                const engine = data.engine ?? "surrealkv";
                const endpoint = data.url ?? `${engine}://${data.folder ?? "database"}`;
                await surreal.connect(endpoint);
                await surreal.use({
                    namespace: data.namespace ?? "nationdex",
                    database: data.database ?? "db"
                });
                if (data.username && data.password) {
                    await surreal.signin({
                        username: data.username,
                        password: data.password
                    });
                }
                await surreal.query(`
                    DEFINE TABLE IF NOT EXISTS record SCHEMALESS;
                    DEFINE TABLE IF NOT EXISTS cooldown SCHEMALESS;
                `);
                db = surreal;
                break;
            }
            case "mysql":
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.mysql,
                    synchronize: true,
                });
                db = await db.initialize();
                break;
            case "postgres":
                db = new typeorm_1.DataSource({
                    ...data,
                    entities: this.entityManager.postgres,
                    synchronize: true,
                });
                db = await db.initialize();
                break;
            default:
                throw new Error(`Unsupported database type "${data.type}". Supported types are: surrealdb, postgres, mysql.`);
        }
        activeDataBases.push({ name: this.database, db });
        return db;
    }
    async waitForConfig() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (config) {
                    clearInterval(check);
                    resolve(config);
                }
            }, 50);
            setTimeout(() => {
                clearInterval(check);
                if (!config)
                    throw new Error("Unable to resolve DB extension configuration. Dependent packages failed to initialize.");
            }, 10_000);
        });
    }
}
exports.DataBaseManager = DataBaseManager;
//# sourceMappingURL=databaseManager.js.map