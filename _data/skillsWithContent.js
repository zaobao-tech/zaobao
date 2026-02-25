"use strict";

const fs = require("fs");
const path = require("path");
const loadSkills = require("./skillsLoader.js");
const getZaobao = require("./zaobao.js");

const md = require("markdown-it")({ html: true });

function extractFrontmatter(raw) {
  if (!raw || !raw.startsWith("---\n")) return { body: raw };
  const endFence = raw.indexOf("\n---", 4);
  if (endFence === -1) return { body: raw };
  return { body: raw.slice(endFence + 4).replace(/^\n?/, "") };
}

module.exports = function () {
  const skills = loadSkills();
  const zaobaoData = getZaobao();
  const bySlug = zaobaoData.skillContentBySlug || {};
  const contentDir = path.join(__dirname, "..", "content", "skills");
  const hasSkillsDir = fs.existsSync(contentDir) && fs.statSync(contentDir).isDirectory();

  return skills.map((s) => {
    let contentHtml = bySlug[s.slug] || "";
    if (!contentHtml && hasSkillsDir) {
      const file = path.join(contentDir, s.slug + ".md");
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, "utf-8");
          const { body } = extractFrontmatter(raw);
          contentHtml = md.render(body);
        } catch (e) {
          console.warn("skillsWithContent: skip " + s.slug + ": " + e.message);
        }
      }
    }
    return { ...s, contentHtml };
  });
};
