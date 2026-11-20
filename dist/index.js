import { Compiler, EventManager, ForgeExtension } from "@tryforge/forgescript";
import { DataBase } from "./util";
import { DBCommandManager } from "./structures";
import { EventEmitter } from "node:events";
import { version } from "../package.json";

export class DB extends ForgeExtension {
  options;
  static defaults;
  name = "db";
  description = "A fast and reliable database extension for ForgeScript.";
  version = version;
  commands;
  emitter = new EventEmitter;
  constructor(options) {
    super();
    this.options = options;
  }
  init(client) {
    this.commands = new DBCommandManager(client);
    EventManager.load("DBEvents", import.meta.dir + "/events");
    this.load(import.meta.dir + "/functions");
    new DataBase(this.emitter, this.options).init().catch((err) => console.error("[db] Failed to initialize database:", err));
    client.db = DataBase;
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
        obj[key] = Compiler.compile(value);
      } else {
        obj[key] = value;
      }
    }
    return obj;
  }
}
