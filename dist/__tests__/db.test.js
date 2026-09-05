"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const database_1 = require("../util/database");
(0, node_test_1.describe)("ForgeDB (PGlite) CRUD Suite", () => {
    const testDbFolder = node_path_1.default.resolve(process.cwd(), "test-database");
    const emitter = new tiny_typed_emitter_1.TypedEmitter();
    (0, node_test_1.before)(async () => {
        const db = new database_1.DataBase(emitter, { folder: testDbFolder });
        await db.init();
    });
    (0, node_test_1.after)(() => {
        try {
            if (node_fs_1.default.existsSync(testDbFolder)) {
                node_fs_1.default.rmSync(testDbFolder, { recursive: true, force: true });
            }
        }
        catch { }
    });
    (0, node_test_1.it)("performs Record CRUD operations and emits events", async () => {
        let createEmitted = false;
        let updateEmitted = false;
        let deleteEmitted = false;
        emitter.on("variableCreate", (payload) => {
            createEmitted = true;
            node_assert_1.default.strictEqual(payload.data?.name, "score");
        });
        emitter.on("variableUpdate", (payload) => {
            updateEmitted = true;
            node_assert_1.default.strictEqual(payload.newData?.value, "999");
        });
        emitter.on("variableDelete", (payload) => {
            deleteEmitted = true;
            node_assert_1.default.strictEqual(payload.data?.name, "score");
        });
        await database_1.DataBase.wipe();
        await database_1.DataBase.set({
            type: "user",
            name: "score",
            id: "user123",
            value: "100",
        });
        (0, node_assert_1.default)(createEmitted, "variableCreate must be emitted");
        const fetched = await database_1.DataBase.get({
            type: "user",
            name: "score",
            id: "user123",
        });
        node_assert_1.default.strictEqual(fetched?.value, "100");
        await database_1.DataBase.set({
            type: "user",
            name: "score",
            id: "user123",
            value: "999",
        });
        (0, node_assert_1.default)(updateEmitted, "variableUpdate must be emitted");
        const all = await database_1.DataBase.getAll();
        node_assert_1.default.strictEqual(all.length, 1);
        await database_1.DataBase.delete({
            type: "user",
            name: "score",
            id: "user123",
        });
        (0, node_assert_1.default)(deleteEmitted, "variableDelete must be emitted");
        const afterDelete = await database_1.DataBase.get({
            type: "user",
            name: "score",
            id: "user123",
        });
        node_assert_1.default.strictEqual(afterDelete, null);
    });
    (0, node_test_1.it)("performs Cooldown CRUD", async () => {
        await database_1.DataBase.cdWipe();
        await database_1.DataBase.cdAdd({
            name: "hourly",
            id: "userA",
            duration: 3600000,
        });
        const cd = await database_1.DataBase.cdTimeLeft("hourly_userA");
        (0, node_assert_1.default)(cd.left > 0);
        await database_1.DataBase.cdDelete("hourly_userA");
        const cdAfter = await database_1.DataBase.cdTimeLeft("hourly_userA");
        node_assert_1.default.strictEqual(cdAfter.left, 0);
    });
    (0, node_test_1.it)("executes raw queries", async () => {
        const res = await database_1.DataBase.query("SELECT 1 AS one");
        (0, node_assert_1.default)(res !== undefined);
    });
});
//# sourceMappingURL=db.test.js.map