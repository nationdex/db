import type { IDBEvents } from "../structures"

export enum SortType {
    asc,
    desc,
}

export enum DataType {
    identifier,
    name,
    id,
    type,
    value,
    guildId,
}

export enum VariableType {
    user,
    channel,
    role,
    message,
    member,
    custom,
    guild,
}

export type IDataBaseOptions = {
    /** Directory PGlite persists its data to. Ignored when `memory` is true. Defaults to "database". */
    folder?: string
    /** Run PGlite fully in-memory, with no persistence. */
    memory?: boolean
    events?: Array<keyof IDBEvents>
}

export type BaseData = {
    identifier?: string
    name?: string
    id?: string
    value?: string
}

export type GuildData = BaseData & { type?: "member" | "channel" | "role"; guildId: string }
export type NonGuildData = BaseData & { type?: "user" | "message" | "custom" | "guild" | "old" }

export type RecordData = BaseData & (GuildData | NonGuildData)

export interface DBRecord {
    identifier: string
    name: string
    id?: string
    type: "user" | "channel" | "role" | "message" | "member" | "custom" | "guild" | "old"
    value: string
    guildId?: string
}

export interface CooldownRecord {
    identifier: string
    name: string
    id?: string
    startedAt: string
    duration: number
}

export type CooldownData = {
    identifier?: string
    name?: string
    id?: string
    startedAt?: string
    duration?: number
}
