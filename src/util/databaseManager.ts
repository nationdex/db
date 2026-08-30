import "reflect-metadata";
import { IDataBaseOptions } from "./types";
import { DataSource, EntitySchema, MixedList } from "typeorm";

const activeDataBases: { name: string; db: any }[] = [];
let config: IDataBaseOptions;

export abstract class DataBaseManager {
    public abstract database: string
    public abstract entityManager: {
        sqlite: MixedList<Function | string | EntitySchema>
        mongodb: MixedList<Function | string | EntitySchema>
        mysql: MixedList<Function | string | EntitySchema>
        postgres: MixedList<Function | string | EntitySchema>
    }

    public type?: IDataBaseOptions["type"]
    public static type: IDataBaseOptions["type"]

    constructor(options?: IDataBaseOptions) {
        if (!config && options) {
            options.type = options.type ?? "sqlite"
            config = options
        }
    }

    protected async getDB() {
        await this.waitForConfig();
        this.type = config.type
        DataBaseManager.type = this.type

        const check = activeDataBases.find((s) => s.name == this.database)
        if (check?.name == this.database) return check.db;
        const data: IDataBaseOptions = { ...config };
        let db: any;
        switch (data.type) {
            case "surrealdb": {
                const { Surreal, createRemoteEngines } = require("surrealdb")
                let engines = {}
                try {
                    const { createNodeEngines } = await (Function('return import("@surrealdb/node")')())
                    if (createNodeEngines) engines = { ...engines, ...createNodeEngines() }
                } catch {}
                try {
                    if (typeof createRemoteEngines === "function") {
                        engines = { ...engines, ...createRemoteEngines() }
                    }
                } catch {}
                const surreal = new Surreal({ engines })
                const endpoint = data.url ?? `surrealkv://${data.folder ?? "database"}`
                await surreal.connect(endpoint)
                await surreal.use({
                    namespace: data.namespace ?? "nationdex",
                    database: data.database ?? "db"
                })
                if (data.username && data.password) {
                    await surreal.signin({
                        username: data.username,
                        password: data.password
                    })
                }
                await surreal.query(`
                    DEFINE TABLE IF NOT EXISTS record SCHEMALESS;
                    DEFINE TABLE IF NOT EXISTS cooldown SCHEMALESS;
                `)
                db = surreal
                break;
            }
            case "mysql":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.mysql,
                    synchronize: true,
                })
                db = await db.initialize()
                break;
            case "postgres":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.postgres,
                    synchronize: true,
                })
                db = await db.initialize()
                break;
            case "mongodb":
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.mongodb,
                    synchronize: true,
                })
                db = await db.initialize()
                break;
            default:
                db = new DataSource({
                    ...data,
                    entities: this.entityManager.sqlite,
                    synchronize: true,
                    database: `${data.folder ?? "database"}/${this.database}`,
                })
                db = await db.initialize()
                break;
        }
        activeDataBases.push({ name: this.database, db })
        return db
    }

    private async waitForConfig(){
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if(config){
                    clearInterval(check)
                    resolve(config)
                }
            }, 50)
            setTimeout(() => {
                clearInterval(check)
                if(!config) throw new Error("Unable to resolve DB extension configuration. Dependent packages failed to initialize.")
            }, 10_000)
        })
    }
}
