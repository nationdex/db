import { BaseEventHandler } from "@tryforge/forgescript";
import { DB } from "..";

export class DBEventHandler extends BaseEventHandler {
  register(client) {
    client.getExtension(DB, true)["emitter"].on(this.name, this.listener.bind(client));
  }
}
