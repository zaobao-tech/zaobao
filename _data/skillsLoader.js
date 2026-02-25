"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Load skills from:
 * - _data/skills/*.json (each file: array or { items: [] }) when directory exists → 支持数万条时按分类/字母拆成多文件
 * - _data/skills.json (single file) otherwise
 */
function loadSkills() {
  const dir = path.join(__dirname, "skills");
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    let list = [];
    for (const f of files) {
      const filePath = path.join(dir, f);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const arr = Array.isArray(data) ? data : data.items || data.skills || [];
      list = list.concat(arr);
    }
    return list;
  }
  return require("./skills.json");
}

module.exports = loadSkills;
