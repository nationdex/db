"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prompt = void 0;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_process_1 = require("node:process");
const node_readline_1 = require("node:readline");
async function prompt(q) {
    const itf = (0, node_readline_1.createInterface)(node_process_1.stdin, node_process_1.stdout);
    return new Promise((r) => {
        itf.question(q, (input) => {
            itf.close();
            r(input);
        });
    });
}
exports.prompt = prompt;
const path = "./metadata";
if (!(0, node_fs_1.existsSync)(path))
    (0, node_fs_1.mkdirSync)(path);
const version = require("../package.json").version;
async function main() {
    let skip = false;
    const msg = (await prompt("Please write the commit message: "))
        .replace(/(--?(\w+))/gim, (match) => {
        const name = /(\w+)/.exec(match)[1].toLowerCase();
        switch (name) {
            case "hide": {
                skip = true;
                break;
            }
            default: {
                throw new Error(`--${name} is not a valid flag.`);
            }
        }
        return "";
    })
        .trim();
    const fileName = (0, node_path_1.join)(path, "changelogs.json");
    const json = (0, node_fs_1.existsSync)(fileName) ? JSON.parse((0, node_fs_1.readFileSync)(fileName, "utf-8")) : {};
    json[version] ??= [];
    const author = (0, node_child_process_1.execSync)("git config user.name").toString().trim();
    if (!skip) {
        json[version].unshift({
            message: msg,
            timestamp: new Date(),
            author,
        });
        (0, node_fs_1.writeFileSync)(fileName, JSON.stringify(json), "utf-8");
    }
    const branch = (await prompt("Write the branch name to push to (defaults to dev): ")) || "dev";
    const escapedMsg = msg.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$");
    (0, node_child_process_1.execSync)(`git branch -M ${branch} && git add . && git commit -m "${escapedMsg}" && git push -u origin ${branch}`, {
        stdio: "inherit",
    });
}
// Nothing
main();
//# sourceMappingURL=commit.js.map