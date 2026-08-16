import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { TypedEmitter } from "tiny-typed-emitter"
import type { TransformEvents } from ".."
import type { IDBEvents } from "../structures"
import { DataBase } from "../util/database"
import { patchBunMkdir, resolveModule } from "../util/resolver"

async function runTests() {
    console.log("=== Running ForgeDB Test Suite ===")
    console.log("Runtime:", typeof process !== "undefined" && (process.versions as any)?.bun ? `Bun ${process.versions.bun}` : `Node.js ${process.version}`)

    // 1. Test resolver utility
    console.log("\n[1/5] Testing resolveModule & patchBunMkdir...")
    patchBunMkdir()
    const sqlite3 = resolveModule("sqlite3")
    assert(sqlite3 !== undefined, "resolveModule('sqlite3') should resolve installed sqlite3")
    console.log("✓ resolveModule('sqlite3') successfully resolved")

    // 2. Test DataBase initialization with SQLite
    console.log("\n[2/5] Testing DataBase initialization...")
    const testDbFolder = path.resolve(process.cwd(), "test-database")
    const emitter = new TypedEmitter<TransformEvents<IDBEvents>>()

    let connectEmitted = false
    emitter.on("connect", () => {
        connectEmitted = true
    })

    const db = new DataBase(emitter, {
        type: "sqlite",
        folder: testDbFolder,
    })
    await db.init()
    assert(connectEmitted, "connect event should be emitted on init")
    console.log("✓ DataBase initialized and 'connect' event fired")

    // 3. Test Record CRUD Operations & Events
    console.log("\n[3/5] Testing Record CRUD operations & events...")
    let createEmitted = false
    let updateEmitted = false
    let deleteEmitted = false

    emitter.on("variableCreate", (payload) => {
        createEmitted = true
        assert.strictEqual(payload.data?.name, "coins")
        assert.strictEqual(payload.data?.value, "100")
    })

    emitter.on("variableUpdate", (payload) => {
        updateEmitted = true
        assert.strictEqual(payload.newData?.value, "250")
    })

    emitter.on("variableDelete", (payload) => {
        deleteEmitted = true
        assert.strictEqual(payload.data?.name, "coins")
    })

    // Wipe clean
    await DataBase.wipe()

    // Create
    await DataBase.set({
        type: "user",
        name: "coins",
        id: "123456789",
        value: "100",
    })
    assert(createEmitted, "variableCreate should be emitted")
    console.log("✓ Variable create successful")

    // Get
    const record = await DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    })
    assert(record !== null, "Record should exist")
    assert.strictEqual(record?.value, "100", "Record value should match")
    console.log("✓ Variable get successful")

    // Update
    await DataBase.set({
        type: "user",
        name: "coins",
        id: "123456789",
        value: "250",
    })
    assert(updateEmitted, "variableUpdate should be emitted")
    const updated = await DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    })
    assert.strictEqual(updated?.value, "250", "Updated value should match")
    console.log("✓ Variable update successful")

    // Find & GetAll
    const all = await DataBase.getAll()
    assert.strictEqual(all.length, 1, "getAll should return 1 record")
    const found = await DataBase.find({ name: "coins" })
    assert.strictEqual(found.length, 1, "find should return matching records")
    console.log("✓ Find and GetAll successful")

    // Delete
    await DataBase.delete({
        type: "user",
        name: "coins",
        id: "123456789",
    })
    assert(deleteEmitted, "variableDelete should be emitted")
    const deleted = await DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    })
    assert.strictEqual(deleted, null, "Deleted record should be null")
    console.log("✓ Variable delete successful")

    // 4. Test Cooldown CRUD
    console.log("\n[4/5] Testing Cooldown CRUD operations...")
    await DataBase.cdWipe()

    await DataBase.cdAdd({
        name: "daily",
        id: "user1",
        duration: 60000,
    })

    const cdInfo = await DataBase.cdTimeLeft("daily_user1")
    assert(cdInfo.left > 0, "Cooldown time left should be > 0")
    console.log("✓ Cooldown add and timeLeft successful")

    await DataBase.cdDelete("daily_user1")
    const cdAfterDelete = await DataBase.cdTimeLeft("daily_user1")
    assert.strictEqual(cdAfterDelete.left, 0, "Deleted cooldown left should be 0")
    console.log("✓ Cooldown delete successful")

    // 5. Test Raw Query & Ping
    console.log("\n[5/5] Testing Raw Query & Ping...")
    const pingResult = await DataBase.ping()
    assert(pingResult !== undefined, "Ping should return a result")
    console.log("✓ Ping successful")

    console.log("\n========================================")
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
    console.log("========================================\n")

    // Clean up test database folder
    try {
        if (fs.existsSync(testDbFolder)) {
            fs.rmSync(testDbFolder, { recursive: true, force: true })
        }
    } catch {}
}

runTests()
    .then(() => {
        process.exit(0)
    })
    .catch((err) => {
        console.error("Test Suite Failed:", err)
        process.exit(1)
    })