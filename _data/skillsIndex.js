"use strict";

const categories = require("./categories.json");
const loadSkills = require("./skillsLoader.js");
const skills = loadSkills();

function countSkillsInTree(slugPrefix) {
  return skills.filter((s) => s.categorySlugs && s.categorySlugs.some((c) => c === slugPrefix || c.startsWith(slugPrefix + "/"))).length;
}

const skillsByCategorySlug = {};
(skills || []).forEach((skill) => {
  (skill.categorySlugs || []).forEach((slug) => {
    if (!skillsByCategorySlug[slug]) skillsByCategorySlug[slug] = [];
    skillsByCategorySlug[slug].push(skill);
  });
});

const categoryTreeWithCounts = (categories || []).map((parent) => {
  const parentSlug = parent.slug;
  const parentCount = countSkillsInTree(parentSlug);
  const children = (parent.children || []).map((child) => {
    const fullSlug = parentSlug + "/" + child.slug;
    return {
      ...child,
      fullSlug,
      count: (skillsByCategorySlug[fullSlug] || []).length,
    };
  });
  return {
    ...parent,
    count: parentCount,
    children,
  };
});

const categoryPages = [];
(categories || []).forEach((parent) => {
  const parentSlug = parent.slug;
  categoryPages.push({
    path: parentSlug,
    type: "parent",
    name: parent.name,
    nameZh: parent.nameZh,
    description: parent.description,
    count: countSkillsInTree(parentSlug),
    children: (parent.children || []).map((child) => {
      const fullSlug = parentSlug + "/" + child.slug;
      return {
        ...child,
        fullSlug,
        count: (skillsByCategorySlug[fullSlug] || []).length,
      };
    }),
  });
  (parent.children || []).forEach((child) => {
    const fullSlug = parentSlug + "/" + child.slug;
    categoryPages.push({
      path: fullSlug,
      type: "child",
      parentSlug,
      parentName: parent.name,
      parentNameZh: parent.nameZh,
      name: child.name,
      nameZh: child.nameZh,
      description: child.description,
      skills: skillsByCategorySlug[fullSlug] || [],
      count: (skillsByCategorySlug[fullSlug] || []).length,
    });
  });
});

const skillBySlug = {};
(skills || []).forEach((s) => {
  skillBySlug[s.slug] = s;
});

const slugToName = {};
(categories || []).forEach((parent) => {
  slugToName[parent.slug] = parent.nameZh || parent.name;
  (parent.children || []).forEach((child) => {
    const fullSlug = parent.slug + "/" + child.slug;
    slugToName[fullSlug] = child.nameZh || child.name;
  });
});

const tagToSkills = {};
(skills || []).forEach((skill) => {
  (skill.tags || []).forEach((tag) => {
    if (!tagToSkills[tag]) tagToSkills[tag] = [];
    tagToSkills[tag].push(skill);
  });
});

module.exports = {
  categoryTreeWithCounts,
  categoryPages,
  skillsByCategorySlug,
  skillBySlug,
  slugToName,
  tagToSkills,
  skillsList: skills || [],
};
