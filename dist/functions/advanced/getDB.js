"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$getDB",
    version: "1.0.0",
    aliases: ["$getDataBase", "$getRecords"],
    description: "Returns all stored identifiers in the database",
    output: script_1.ArgType.Json,
    unwrap: false,
    async execute(_ctx) {
        return this.successJSON(await util_1.DataBase.getAll());
    },
});
//# sourceMappingURL=getDB.js.map