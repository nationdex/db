import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, describe, it } from "bun:test"
import { EventEmitter } from "node:events"
import type { IDBEvents } from "../structures"
import { DataBase } from "../util/database"

describe("ForgeDB (PGlite) CRUD Suite", () => {
    const testDbFolder = path.resolve(process.cwd(), "test-database")
    const emitter = new EventEmitter<IDBEvents>()

    beforeAll(async () => {
        const db = new DataBase(emitter, { folder: testDbFolder })
        await db.init()
    })

    afterAll(() => {
        try {
            if (fs.existsSync(testDbFolder)) {
                fs.rmSync(testDbFolder, { recursive: true, force: true })
            }
        } catch {}
    })

    it("performs Record CRUD operations and emits events", async () => {
        let createEmitted = false
        let updateEmitted = false
        let deleteEmitted = false

        emitter.on("variableCreate", (payload) => {
            createEmitted = true
            assert.strictEqual(payload.data?.name, "score")
        })
        emitter.on("variableUpdate", (payload) => {
            updateEmitted = true
            assert.strictEqual(payload.newData?.value, "999")
        })
        emitter.on("variableDelete", (payload) => {
            deleteEmitted = true
            assert.strictEqual(payload.data?.name, "score")
        })

        await DataBase.wipe()

        await DataBase.set({
            type: "user",
            name: "score",
            id: "user123",
            value: "100",
        })
        assert(createEmitted, "variableCreate must be emitted")

        const fetched = await DataBase.get({
            type: "user",
            name: "score",
            id: "user123",
        })
        assert.strictEqual(fetched?.value, "100")

        await DataBase.set({
            type: "user",
            name: "score",
            id: "user123",
            value: "999",
        })
        assert(updateEmitted, "variableUpdate must be emitted")

        const all = await DataBase.getAll()
        assert.strictEqual(all.length, 1)

        await DataBase.delete({
            type: "user",
            name: "score",
            id: "user123",
        })
        assert(deleteEmitted, "variableDelete must be emitted")

        const afterDelete = await DataBase.get({
            type: "user",
            name: "score",
            id: "user123",
        })
        assert.strictEqual(afterDelete, null)
    })

    it("performs Cooldown CRUD", async () => {
        await DataBase.cdWipe()
        await DataBase.cdAdd({
            name: "hourly",
            id: "userA",
            duration: 3600000,
        })
        const cd = await DataBase.cdTimeLeft("hourly_userA")
        assert(cd.left > 0)

        await DataBase.cdDelete("hourly_userA")
        const cdAfter = await DataBase.cdTimeLeft("hourly_userA")
        assert.strictEqual(cdAfter.left, 0)
    })

    it("executes raw queries", async () => {
        const res = await DataBase.query("SELECT 1 AS one")
        assert(res !== undefined)
    })

    it("rejects writes missing required fields instead of hitting a NOT NULL constraint", async () => {
        await assert.rejects(() => DataBase.set({ type: "user", id: "u1" } as any), /`name` is required/)
        await assert.rejects(() => DataBase.set({ name: "x", id: "u1" } as any), /`type` is required/)
        await assert.rejects(() => DataBase.set({ name: "x", type: "user", id: "u1" } as any), /`value` is required/)
    })
})

describe("ForgeDB (PGlite) initialization & lifecycle", () => {
    it("queues calls made before init() resolves instead of throwing", async () => {
        const folder = path.resolve(process.cwd(), "test-database-race")
        const emitter = new EventEmitter<IDBEvents>()
        const db = new DataBase(emitter, { folder })

        const initPromise = db.init()
        // Fired before init() has resolved — must wait on the same readiness gate, not throw.
        const racedSet = DataBase.set({ type: "user", name: "race", id: "u1", value: "1" })

        await Promise.all([initPromise, racedSet])
        const fetched = await DataBase.get({ type: "user", name: "race", id: "u1" })
        assert.strictEqual(fetched?.value, "1")

        await DataBase.close()
        try {
            if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true })
        } catch {}
    })

    it("close() flushes and shuts down cleanly", async () => {
        const emitter = new EventEmitter<IDBEvents>()
        const db = new DataBase(emitter, { memory: true })
        await db.init()
        await DataBase.set({ type: "user", name: "tmp", id: "u1", value: "1" })
        await DataBase.close()
    })
})
