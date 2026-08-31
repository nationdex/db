import "reflect-metadata";
import { IDataBaseOptions } from "./types";
import { EntitySchema, MixedList } from "typeorm";
export declare abstract class DataBaseManager {
    abstract database: string;
    abstract entityManager: {
        mysql: MixedList<Function | string | EntitySchema>;
        postgres: MixedList<Function | string | EntitySchema>;
    };
    type?: IDataBaseOptions["type"];
    static type: IDataBaseOptions["type"];
    constructor(options?: IDataBaseOptions);
    protected getDB(): Promise<any>;
    private waitForConfig;
}
//# sourceMappingURL=databaseManager.d.ts.map