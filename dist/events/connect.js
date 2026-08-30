"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const forgescript_1 = require("@tryforge/forgescript");
const __1 = require("..");
const eventManager_1 = require("../structures/eventManager");
exports.default = new eventManager_1.DBEventHandler({
    name: "connect",
    version: "2.0.0",
    description: "This event is triggered when db is connected with ForgeScript",
    listener() {
        const commands = this.getExtension(__1.DB, true).commands.get("connect");
        for (const command of commands) {
            forgescript_1.Interpreter.run({
                obj: {},
                client: this,
                command,
                data: command.compiled.code,
            });
        }
    },
});
//# sourceMappingURL=connect.js.map