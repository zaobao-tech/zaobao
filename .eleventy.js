const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt({ html: true });

module.exports = function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.ignores.add("design.md");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("LICENSE");
  eleventyConfig.ignores.add("content/*.md");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  eleventyConfig.addShortcode("markdown", function (content) {
    if (!content) return "";
    return md.render(content);
  });

  eleventyConfig.addFilter("json", function (obj) {
    return JSON.stringify(obj || {});
  });

  eleventyConfig.addFilter("formatDateCN", function (dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const w = weekdays[d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${w}`;
  });

  eleventyConfig.addFilter("formatDateLine", function (dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return dateStr + " " + weekdays[d.getDay()];
  });

  eleventyConfig.addFilter("encodeTagUri", function (s) {
    return encodeURIComponent(String(s || ""));
  });

  eleventyConfig.addFilter("formatDateRSS", function (dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toUTCString();
  });

  eleventyConfig.addFilter("escapeXml", function (s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "dist",
    },
    pathPrefix: "/",
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
