const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt({ html: true });

const DATA_DIR = path.join(__dirname, "..", "data");
const CONTENT_DIR = path.join(__dirname, "..", "content");

function getISODay(d) {
  return (d.getDay() + 6) % 7;
}
function getISOWeek(d) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const jan4 = new Date(t.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  return Math.floor((t - start) / 86400000 / 7) + 1;
}

function loadAllDays() {
  const days = {};
  if (!fs.existsSync(DATA_DIR)) return days;
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const dateKey = path.basename(file, ".json");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      const items = (data.items || []).map((item) => {
        let contentHtml = "";
        if (item.content) {
          contentHtml = md.render(item.content);
        } else if (item.contentRef && fs.existsSync(path.join(CONTENT_DIR, item.contentRef))) {
          const body = fs.readFileSync(path.join(CONTENT_DIR, item.contentRef), "utf-8");
          contentHtml = md.render(body);
        }
        return { ...item, contentHtml };
      });
      days[dateKey] = { date: dateKey, items };
    } catch (e) {
      console.warn("Skip " + file + ": " + e.message);
    }
  }
  return days;
}

function buildTagsIndex(daysByDate) {
  const tagMap = {};
  for (const [dateKey, day] of Object.entries(daysByDate)) {
    day.items.forEach((item, idx) => {
      for (const tag of item.tags || []) {
        if (!tagMap[tag]) tagMap[tag] = [];
        tagMap[tag].push({ dateKey, item, index: idx });
      }
    });
  }
  return tagMap;
}

function buildYearGrid(year, daysByDate) {
  const grid = [];
  for (let w = 0; w < 53; w++) grid[w] = Array(7).fill(null);
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const today = new Date();
  const todayKey =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey =
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    const week = getISOWeek(d) - 1;
    const day = getISODay(d);
    if (week >= 0 && week < 53) {
      const dayData = daysByDate[dateKey];
      const count = dayData ? dayData.items.length : 0;
      grid[week][day] = {
        dateKey,
        count,
        isToday: dateKey === todayKey,
        title: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${"日一二三四五六"[d.getDay()]}`,
      };
    }
  }
  return grid;
}

function getYearsWithData(daysByDate) {
  const set = new Set();
  for (const dateKey of Object.keys(daysByDate)) {
    set.add(dateKey.slice(0, 4));
  }
  const curYear = new Date().getFullYear();
  if (!set.has(String(curYear))) set.add(String(curYear));
  return Array.from(set)
    .map(Number)
    .sort((a, b) => b - a);
}

function buildMonthLabels(year) {
  const labels = new Array(53).fill(0);
  for (let month = 1; month <= 12; month++) {
    const d = new Date(year, month - 1, 1);
    const week = getISOWeek(d) - 1;
    if (week >= 0 && week < 53) labels[week] = month;
  }
  return labels;
}

module.exports = function () {
  const daysByDate = loadAllDays();
  const tagsIndex = buildTagsIndex(daysByDate);
  const years = getYearsWithData(daysByDate);
  const calendarByYear = {};
  const monthLabelsByYear = {};
  for (const y of years) {
    const grid = buildYearGrid(y, daysByDate);
    const rowsByDay = [];
    for (let day = 0; day < 7; day++) {
      const row = [];
      for (let week = 0; week < 53; week++) {
        row.push(grid[week] && grid[week][day] ? grid[week][day] : null);
      }
      rowsByDay.push(row);
    }
    calendarByYear[y] = rowsByDay;
    monthLabelsByYear[y] = buildMonthLabels(y);
  }
  const totalByYear = {};
  for (const [dateKey, day] of Object.entries(daysByDate)) {
    const y = dateKey.slice(0, 4);
    totalByYear[y] = (totalByYear[y] || 0) + day.items.length;
  }
  const tagsList = Object.entries(tagsIndex)
    .map(([name, entries]) => ({ name, count: entries.length }))
    .sort((a, b) => b.count - a.count);

  const daysList = Object.entries(daysByDate)
    .map(([dateKey, day]) => ({ dateKey, day }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const articlesList = [];
  daysList.forEach(({ dateKey, day }) => {
    day.items.forEach((item, index) => {
      articlesList.push({ dateKey, index, item, day });
    });
  });

  return {
    daysByDate,
    daysList,
    articlesList,
    tagsIndex,
    tagsList,
    years,
    calendarByYear,
    monthLabelsByYear,
    totalByYear,
  };
};
