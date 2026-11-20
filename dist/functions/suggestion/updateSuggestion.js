import { ArgType, NativeFunction } from "@tryforge/forgescript";
import { DataBase } from "../../util";
export default new NativeFunction({
  name: "$updateSuggestion",
  version: "1.0.0",
  description: "Updates a suggestion's status/fields/message location, returns the updated record as JSON",
  output: ArgType.Unknown,
  unwrap: true,
  args: [
    { name: "id", description: "Suggestion id", rest: false, type: ArgType.Number, required: true },
    { name: "status", description: "pending | approved | denied | changes_requested", rest: false, type: ArgType.String, required: false },
    { name: "fields", description: "JSON string replacing the suggestion's fields", rest: false, type: ArgType.String, required: false },
    { name: "imageUrl", description: "Primary image URL", rest: false, type: ArgType.String, required: false },
    { name: "altImageUrl", description: "Alt image URL", rest: false, type: ArgType.String, required: false },
    { name: "messageId", description: "Discord message id hosting the embed", rest: false, type: ArgType.String, required: false },
    { name: "channelId", description: "Discord channel id hosting the embed", rest: false, type: ArgType.String, required: false }
  ],
  brackets: true,
  async execute(_ctx, [id, status, fields, imageUrl, altImageUrl, messageId, channelId]) {
    const suggestion = await DataBase.updateSuggestion(Number(id), {
      status: status ? status : undefined,
      fields: fields ? JSON.parse(fields) : undefined,
      imageUrl: imageUrl ? imageUrl : undefined,
      altImageUrl: altImageUrl ? altImageUrl : undefined,
      messageId: messageId ? messageId : undefined,
      channelId: channelId ? channelId : undefined
    });
    if (!suggestion)
      return this.customError("Suggestion not found");
    return this.successJSON(suggestion);
  }
});
