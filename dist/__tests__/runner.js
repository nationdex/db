"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const database_1 = require("../util/database");
const resolver_1 = require("../util/resolver");
async function runTests() {
    console.log("=== Running ForgeDB Test Suite ===");
    console.log("Runtime:", typeof process !== "undefined" && process.versions?.bun ? `Bun ${process.versions.bun}` : `Node.js ${process.version}`);
    // 1. Test resolver utility
    console.log("\n[1/5] Testing resolveModule & patchBunMkdir...");
    (0, resolver_1.patchBunMkdir)();
    const sqlite3 = (0, resolver_1.resolveModule)("sqlite3");
    (0, node_assert_1.default)(sqlite3 !== undefined, "resolveModule('sqlite3') should resolve installed sqlite3");
    console.log("✓ resolveModule('sqlite3') successfully resolved");
    // 2. Test DataBase initialization with SQLite
    console.log("\n[2/5] Testing DataBase initialization...");
    const testDbFolder = node_path_1.default.resolve(process.cwd(), "test-database");
    const emitter = new tiny_typed_emitter_1.TypedEmitter();
    let connectEmitted = false;
    emitter.on("connect", () => {
        connectEmitted = true;
    });
    const db = new database_1.DataBase(emitter, {
        type: "sqlite",
        folder: testDbFolder,
    });
    await db.init();
    (0, node_assert_1.default)(connectEmitted, "connect event should be emitted on init");
    console.log("✓ DataBase initialized and 'connect' event fired");
    // 3. Test Record CRUD Operations & Events
    console.log("\n[3/5] Testing Record CRUD operations & events...");
    let createEmitted = false;
    let updateEmitted = false;
    let deleteEmitted = false;
    emitter.on("variableCreate", (payload) => {
        createEmitted = true;
        node_assert_1.default.strictEqual(payload.data?.name, "coins");
        node_assert_1.default.strictEqual(payload.data?.value, "100");
    });
    emitter.on("variableUpdate", (payload) => {
        updateEmitted = true;
        node_assert_1.default.strictEqual(payload.newData?.value, "250");
    });
    emitter.on("variableDelete", (payload) => {
        deleteEmitted = true;
        node_assert_1.default.strictEqual(payload.data?.name, "coins");
    });
    // Wipe clean
    await database_1.DataBase.wipe();
    // Create
    await database_1.DataBase.set({
        type: "user",
        name: "coins",
        id: "123456789",
        value: "100",
    });
    (0, node_assert_1.default)(createEmitted, "variableCreate should be emitted");
    console.log("✓ Variable create successful");
    // Get
    const record = await database_1.DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    });
    (0, node_assert_1.default)(record !== null, "Record should exist");
    node_assert_1.default.strictEqual(record?.value, "100", "Record value should match");
    console.log("✓ Variable get successful");
    // Update
    await database_1.DataBase.set({
        type: "user",
        name: "coins",
        id: "123456789",
        value: "250",
    });
    (0, node_assert_1.default)(updateEmitted, "variableUpdate should be emitted");
    const updated = await database_1.DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    });
    node_assert_1.default.strictEqual(updated?.value, "250", "Updated value should match");
    console.log("✓ Variable update successful");
    // Find & GetAll
    const all = await database_1.DataBase.getAll();
    node_assert_1.default.strictEqual(all.length, 1, "getAll should return 1 record");
    const found = await database_1.DataBase.find({ name: "coins" });
    node_assert_1.default.strictEqual(found.length, 1, "find should return matching records");
    console.log("✓ Find and GetAll successful");
    // Delete
    await database_1.DataBase.delete({
        type: "user",
        name: "coins",
        id: "123456789",
    });
    (0, node_assert_1.default)(deleteEmitted, "variableDelete should be emitted");
    const deleted = await database_1.DataBase.get({
        type: "user",
        name: "coins",
        id: "123456789",
    });
    node_assert_1.default.strictEqual(deleted, null, "Deleted record should be null");
    console.log("✓ Variable delete successful");
    // 4. Test Cooldown CRUD
    console.log("\n[4/5] Testing Cooldown CRUD operations...");
    await database_1.DataBase.cdWipe();
    await database_1.DataBase.cdAdd({
        name: "daily",
        id: "user1",
        duration: 60000,
    });
    const cdInfo = await database_1.DataBase.cdTimeLeft("daily_user1");
    (0, node_assert_1.default)(cdInfo.left > 0, "Cooldown time left should be > 0");
    console.log("✓ Cooldown add and timeLeft successful");
    await database_1.DataBase.cdDelete("daily_user1");
    const cdAfterDelete = await database_1.DataBase.cdTimeLeft("daily_user1");
    node_assert_1.default.strictEqual(cdAfterDelete.left, 0, "Deleted cooldown left should be 0");
    console.log("✓ Cooldown delete successful");
    // 5. Test Raw Query & Ping
    console.log("\n[5/5] Testing Raw Query & Ping...");
    const pingResult = await database_1.DataBase.ping();
    (0, node_assert_1.default)(pingResult !== undefined, "Ping should return a result");
    console.log("✓ Ping successful");
    console.log("\n========================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("========================================\n");
    // Clean up test database folder
    try {
        if (node_fs_1.default.existsSync(testDbFolder)) {
            node_fs_1.default.rmSync(testDbFolder, { recursive: true, force: true });
        }
    }
    catch { }
}
runTests()
    .then(() => {
    process.exit(0);
})
    .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
});
//# sourceMappingURL=runner.js.map