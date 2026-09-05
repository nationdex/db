import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import { TypedEmitter } from "tiny-typed-emitter"
import type { TransformEvents } from ".."
import type { IDBEvents } from "../structures"
import { DataBase } from "../util/database"

describe("ForgeDB (PGlite) CRUD Suite", () => {
    const testDbFolder = path.resolve(process.cwd(), "test-database")
    const emitter = new TypedEmitter<TransformEvents<IDBEvents>>()

    before(async () => {
        const db = new DataBase(emitter, { folder: testDbFolder })
        await db.init()
    })

    after(() => {
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
})
