"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB = void 0;
const forgescript_1 = require("@tryforge/forgescript");
const util_1 = require("./util");
const structures_1 = require("./structures");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
class DB extends forgescript_1.ForgeExtension {
    options;
    static defaults;
    name = "db";
    description = "A fast and reliable database extension for ForgeScript.";
    version = require("../package.json").version;
    commands;
    emitter = new tiny_typed_emitter_1.TypedEmitter();
    constructor(options) {
        super();
        this.options = options;
    }
    init(client) {
        this.commands = new structures_1.DBCommandManager(client);
        forgescript_1.EventManager.load('DBEvents', __dirname + '/events');
        this.load(__dirname + "/functions");
        new util_1.DataBase(this.emitter, this.options).init();
        client.db = util_1.DataBase;
        if (this.options?.events?.length)
            client.events.load("DBEvents", this.options.events);
    }
    variables(rec) {
        DB.variables(rec);
    }
    static variables(rec) {
        DB.defaults = DB.compileVariables(rec);
    }
    static compileVariables(rec) {
        const obj = {};
        for (const [key, value] of Object.entries(rec)) {
            if (typeof value === "string") {
                obj[key] = forgescript_1.Compiler.compile(value);
            }
            else {
                obj[key] = value;
            }
        }
        return obj;
    }
}
exports.DB = DB;
//# sourceMappingURL=index.js.map