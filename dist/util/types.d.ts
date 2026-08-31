import { IDBEvents } from "../structures";
export declare enum SortType {
    asc = 0,
    desc = 1
}
export declare enum DataType {
    identifier = 0,
    name = 1,
    id = 2,
    type = 3,
    value = 4,
    guildId = 5
}
export declare enum VariableType {
    user = 0,
    channel = 1,
    role = 2,
    message = 3,
    member = 4,
    custom = 5,
    guild = 6
}
export type IDataBaseOptions = ({
    type: "mysql" | "postgres";
    url?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    folder?: string;
} | {
    type: "surrealdb";
    folder?: string;
    engine?: "rocksdb" | "surrealkv" | "mem" | string;
    url?: string;
    namespace?: string;
    database?: string;
    username?: string;
    password?: string;
}) & {
    events?: Array<keyof IDBEvents>;
    folder?: string;
    database?: string;
    engine?: string;
};
export declare class MySQLRecord {
    identifier: string;
    name: string;
    id: string;
    type: "user" | "channel" | "role" | "message" | "member" | "custom" | "guild" | "old";
    value: string;
    guildId?: string;
}
export declare class PostgreSQLRecord {
    identifier: string;
    name: string;
    id: string;
    type: "user" | "channel" | "role" | "message" | "member" | "custom" | "guild" | "old";
    value: string;
    guildId?: string;
}
export type BaseData = {
    identifier?: string;
    name?: string;
    id?: string;
    value?: string;
};
export type GuildData = BaseData & {
    type?: "member" | "channel" | "role";
    guildId: string;
};
export type NonGuildData = BaseData & {
    type?: "user" | "message" | "custom" | "guild" | "old";
};
export type RecordData = BaseData & (GuildData | NonGuildData);
export type DBRecord = MySQLRecord;
export declare class Cooldown {
    identifier: string;
    name: string;
    id?: string;
    startedAt: string;
    duration: number;
}
export type CooldownData = {
    identifier?: string;
    name?: string;
    id?: string;
    startedAt?: string;
    duration?: number;
};
//# sourceMappingURL=types.d.ts.map