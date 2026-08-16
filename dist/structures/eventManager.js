"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBEventHandler = void 0;
const script_1 = require("@nationdex/script");
const __1 = require("..");
class DBEventHandler extends script_1.BaseEventHandler {
    register(client) {
        //@ts-expect-error
        client.getExtension(__1.ForgeDB, true)["emitter"].on(this.name, this.listener.bind(client));
    }
}
exports.DBEventHandler = DBEventHandler;
//# sourceMappingURL=eventManager.js.map