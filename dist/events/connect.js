"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const script_1 = require("@nationdex/script");
const __1 = require("..");
const eventManager_1 = require("../structures/eventManager");
exports.default = new eventManager_1.DBEventHandler({
    name: "connect",
    version: "2.0.0",
    description: "This event is triggered when ForgeDB is connected with ForgeScript",
    listener() {
        const commands = this.getExtension(__1.ForgeDB, true).commands.get("connect");
        for (const command of commands) {
            script_1.Interpreter.run({
                obj: {},
                client: this,
                command,
                data: command.compiled.code,
            });
        }
    },
});
//# sourceMappingURL=connect.js.map