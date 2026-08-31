"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cooldown = exports.PostgreSQLRecord = exports.MySQLRecord = exports.VariableType = exports.DataType = exports.SortType = void 0;
const typeorm_1 = require("typeorm");
var SortType;
(function (SortType) {
    SortType[SortType["asc"] = 0] = "asc";
    SortType[SortType["desc"] = 1] = "desc";
})(SortType || (exports.SortType = SortType = {}));
var DataType;
(function (DataType) {
    DataType[DataType["identifier"] = 0] = "identifier";
    DataType[DataType["name"] = 1] = "name";
    DataType[DataType["id"] = 2] = "id";
    DataType[DataType["type"] = 3] = "type";
    DataType[DataType["value"] = 4] = "value";
    DataType[DataType["guildId"] = 5] = "guildId";
})(DataType || (exports.DataType = DataType = {}));
var VariableType;
(function (VariableType) {
    VariableType[VariableType["user"] = 0] = "user";
    VariableType[VariableType["channel"] = 1] = "channel";
    VariableType[VariableType["role"] = 2] = "role";
    VariableType[VariableType["message"] = 3] = "message";
    VariableType[VariableType["member"] = 4] = "member";
    VariableType[VariableType["custom"] = 5] = "custom";
    VariableType[VariableType["guild"] = 6] = "guild";
})(VariableType || (exports.VariableType = VariableType = {}));
let MySQLRecord = class MySQLRecord {
    identifier;
    name;
    id;
    type;
    value;
    guildId;
};
exports.MySQLRecord = MySQLRecord;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], MySQLRecord.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MySQLRecord.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MySQLRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MySQLRecord.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)("longtext"),
    __metadata("design:type", String)
], MySQLRecord.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MySQLRecord.prototype, "guildId", void 0);
exports.MySQLRecord = MySQLRecord = __decorate([
    (0, typeorm_1.Entity)("record")
], MySQLRecord);
let PostgreSQLRecord = class PostgreSQLRecord {
    identifier;
    name;
    id;
    type;
    value;
    guildId;
};
exports.PostgreSQLRecord = PostgreSQLRecord;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PostgreSQLRecord.prototype, "guildId", void 0);
exports.PostgreSQLRecord = PostgreSQLRecord = __decorate([
    (0, typeorm_1.Entity)("record")
], PostgreSQLRecord);
let Cooldown = class Cooldown {
    identifier;
    name;
    id;
    startedAt;
    duration;
};
exports.Cooldown = Cooldown;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Cooldown.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Cooldown.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Cooldown.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Cooldown.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Cooldown.prototype, "duration", void 0);
exports.Cooldown = Cooldown = __decorate([
    (0, typeorm_1.Entity)()
], Cooldown);
//# sourceMappingURL=types.js.map