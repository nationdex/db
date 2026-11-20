export var SortType;
((SortType) => {
  SortType[SortType["asc"] = 0] = "asc";
  SortType[SortType["desc"] = 1] = "desc";
})(SortType ||= {});
export var DataType;
((DataType) => {
  DataType[DataType["identifier"] = 0] = "identifier";
  DataType[DataType["name"] = 1] = "name";
  DataType[DataType["id"] = 2] = "id";
  DataType[DataType["type"] = 3] = "type";
  DataType[DataType["value"] = 4] = "value";
  DataType[DataType["guildId"] = 5] = "guildId";
})(DataType ||= {});
export var VariableType;
((VariableType) => {
  VariableType[VariableType["user"] = 0] = "user";
  VariableType[VariableType["channel"] = 1] = "channel";
  VariableType[VariableType["role"] = 2] = "role";
  VariableType[VariableType["message"] = 3] = "message";
  VariableType[VariableType["member"] = 4] = "member";
  VariableType[VariableType["custom"] = 5] = "custom";
  VariableType[VariableType["guild"] = 6] = "guild";
})(VariableType ||= {});
