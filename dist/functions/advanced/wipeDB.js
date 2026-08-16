"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const util_1 = require("../../util");
exports.default = new script_1.NativeFunction({
    name: "$wipeDB",
    version: "2.0.8",
    aliases: ["$deleteDB", "$clearDB"],
    description: "Wipes all the data stored in the database including cooldowns",
    output: script_1.ArgType.Json,
    unwrap: false,
    async execute(_ctx) {
        await util_1.DataBase.wipe();
        await util_1.DataBase.cdWipe();
        return this.success();
    },
});
//# sourceMappingURL=wipeDB.js.map