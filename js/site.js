(function () {
  var THEME_KEY = "zaobao-theme";

  function applyTheme(theme) {
    var html = document.documentElement;
    if (theme === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
    var lightBtn = document.getElementById("theme-light");
    var darkBtn = document.getElementById("theme-dark");
    if (lightBtn) lightBtn.classList.toggle("is-active", theme === "light");
    if (darkBtn) darkBtn.classList.toggle("is-active", theme === "dark");
  }

  var saved = "";
  try {
    saved = localStorage.getItem(THEME_KEY) || "light";
  } catch (e) {
    saved = "light";
  }
  applyTheme(saved === "dark" ? "dark" : "light");

  const DATA = window.ZAOBAO_DATA || {};
  const TAGS = window.ZAOBAO_TAGS || {};
  const TOTAL_BY_YEAR = window.ZAOBAO_TOTAL_BY_YEAR || {};
  const YEARS_LIST = window.ZAOBAO_YEARS || [];
  const SKILLS = window.ZAOBAO_SKILLS || [];
  const SKILLS_SLUG_TO_NAME = window.ZAOBAO_SKILLS_SLUG_TO_NAME || {};
  const TAG_SKILLS = window.ZAOBAO_TAG_SKILLS || {};
  const SKILL_CONTENT = window.ZAOBAO_SKILL_CONTENT || {};
  const CATEGORY_TREE = window.ZAOBAO_CATEGORY_TREE || [];
  const SKILLS_BY_CATEGORY = window.ZAOBAO_SKILLS_BY_CATEGORY || {};
  var currentTag = null;
  var skipNextHashChange = false;

  var daysByYear = {};
  (function () {
    for (var dateKey in DATA) {
      var y = dateKey.slice(0, 4);
      if (!daysByYear[y]) daysByYear[y] = [];
      daysByYear[y].push(dateKey);
    }
    for (var y in daysByYear) {
      daysByYear[y].sort(function (a, b) { return b.localeCompare(a); });
    }
  })();

  var YEAR_DAYS_PAGE_SIZE = 20;
  var yearDaysRendered = 0;
  var yearDaysCurrentYear = null;
  var yearDaysScrollLock = false;
  var currentView = "home";

  function todayKey() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function getPathnameNorm() {
    return (window.location.pathname || "/").replace(/^\/|\/$/g, "") || "";
  }
  function isDayPage(pathname) {
    return /^day\/[^/]+\/?$/.test(pathname || getPathnameNorm());
  }
  function isArticlePage(pathname) {
    return /^day\/[^/]+\/\d+$/.test(pathname || getPathnameNorm());
  }
  function getDayPageDateKey(pathname) {
    var p = pathname || getPathnameNorm();
    var m = p.match(/^day\/([^/]+)/);
    return m ? m[1] : null;
  }

  function formatDateTitle(dateKey) {
    if (!dateKey) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return y + "年" + m + "月" + d + "日 " + weekdays[date.getDay()];
  }

  /** 早报日列表用：不包含年份（左侧已选年份） */
  function formatDateTitleNoYear(dateKey) {
    if (!dateKey) return "";
    const [, m, d] = dateKey.split("-").map(Number);
    const y = parseInt(dateKey.slice(0, 4), 10);
    const date = new Date(y, m - 1, d);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return m + "月" + d + "日 " + weekdays[date.getDay()];
  }

  function formatDateLine(dateKey) {
    if (!dateKey) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return dateKey + " " + weekdays[date.getDay()];
  }

  function selectHeatmapDate(dateKey) {
    if (!dateKey) return;
    var wrap = document.querySelector(".heatmap-wrap");
    if (!wrap) return;
    const year = parseInt(dateKey.slice(0, 4), 10);
    switchYear(year);
    document.querySelectorAll(".heatmap-wrap .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
    document.querySelectorAll('.heatmap-wrap .cell[data-date="' + dateKey + '"]').forEach(function (el) {
      el.classList.add("is-selected");
    });
  }

  function getYearFromDateKey(dateKey) {
    return dateKey ? dateKey.slice(0, 4) : null;
  }

  function selectYearDay(dateKey) {
    document.querySelectorAll("#year-days-list .year-day-link.is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
    if (dateKey) {
      document.querySelectorAll('#year-days-list .year-day-link[data-date="' + dateKey + '"]').forEach(function (el) {
        el.classList.add("is-active");
      });
    }
  }

  function renderYearDaysList(year, append) {
    var listEl = document.getElementById("year-days-list");
    var loadingEl = document.getElementById("year-days-loading");
    var emptyEl = document.getElementById("year-days-empty");
    if (!listEl) return;
    var yearStr = String(year);
    var dates = daysByYear[yearStr] || [];
    if (!append) {
      yearDaysCurrentYear = yearStr;
      yearDaysRendered = 0;
      listEl.innerHTML = "";
      if (loadingEl) loadingEl.classList.add("hidden");
      if (emptyEl) {
        if (dates.length === 0) emptyEl.classList.remove("hidden"); else emptyEl.classList.add("hidden");
      }
    }
    if (dates.length === 0) return;
    var start = yearDaysRendered;
    var end = Math.min(start + YEAR_DAYS_PAGE_SIZE, dates.length);
    if (start >= end && append) return;
    if (loadingEl && !append) loadingEl.classList.remove("hidden");
    yearDaysScrollLock = true;
    for (var i = start; i < end; i++) {
      var dateKey = dates[i];
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#/day/" + dateKey + "/1";
      a.className = "year-day-link";
      a.dataset.date = dateKey;
      a.textContent = formatDateTitleNoYear(dateKey) + " 早报";
      a.title = dateKey;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var dk = this.dataset.date;
        skipNextHashChange = true;
        var routeToSet = currentView === "zaobao"
          ? { type: "zaobao", dateKey: dk, index1: 1 }
          : { type: "day", dateKey: dk, index1: 1 };
        setHashRoute(routeToSet);
        selectYearDay(dk);
        switchYear(getYearFromDateKey(dk));
        renderList(dk);
        setTimeout(function () { skipNextHashChange = false; }, 0);
      });
      li.appendChild(a);
      listEl.appendChild(li);
    }
    yearDaysRendered = end;
    if (loadingEl) loadingEl.classList.add("hidden");
    yearDaysScrollLock = false;
    if (yearDaysRendered < dates.length) {
      if (loadingEl) loadingEl.classList.remove("hidden");
    }
  }

  function onYearDaysScroll() {
    if (yearDaysScrollLock || !yearDaysCurrentYear) return;
    var listEl = document.getElementById("year-days-list");
    var loadingEl = document.getElementById("year-days-loading");
    if (!listEl || !loadingEl) return;
    var dates = daysByYear[yearDaysCurrentYear] || [];
    if (yearDaysRendered >= dates.length) return;
    var wrap = listEl.parentElement;
    if (!wrap) return;
    var threshold = wrap.clientHeight + wrap.scrollTop >= listEl.offsetHeight - 100;
    if (threshold) renderYearDaysList(parseInt(yearDaysCurrentYear, 10), true);
  }

  // Hash 路由：日页用 #n（1-based 序号），首页/其他用 #/day/dateKey、#/day/dateKey/n、#/tag/name 等
  function getHashRoute() {
    var pathname = getPathnameNorm();
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (isDayPage(pathname)) {
      var dateKey = getDayPageDateKey(pathname);
      var short = hash.replace(/^\/?/, "");
      var num = parseInt(short, 10);
      if (dateKey && !isNaN(num) && num >= 1) {
        return { type: "day", dateKey: dateKey, index1: num };
      }
    }
    if (!hash || hash === "/") return null;
    var parts = hash.split("/").filter(Boolean);
    if (parts[0] === "day" && parts.length >= 2) {
      return { type: "day", dateKey: parts[1], index1: parts[2] ? parseInt(parts[2], 10) : 1 };
    }
    if (parts[0] === "tag" && parts.length >= 2) {
      var tagName = decodeURIComponent(parts[1]);
      if (parts.length >= 4) {
        return { type: "tag", tag: tagName, dateKey: parts[2], index1: parseInt(parts[3], 10) || 1 };
      }
      return { type: "tag", tag: tagName };
    }
    if (parts[0] === "zaobao") {
      var dateKey = parts[1] || null;
      var index1 = parts[2] ? parseInt(parts[2], 10) : 1;
      return { type: "zaobao", dateKey: dateKey, index1: index1 };
    }
    if (parts[0] === "skills") {
      var CATEGORY_TREE = window.ZAOBAO_CATEGORY_TREE || [];
      var parentSlugs = CATEGORY_TREE.map(function (p) { return p.slug; });
      if (parts.length === 1) return { type: "skills" };
      if (parts.length === 2) {
        if (parentSlugs.indexOf(parts[1]) >= 0) return { type: "skills", parentSlug: parts[1] };
        return { type: "skills", skillSlug: parts[1] };
      }
      if (parts.length >= 3) {
        var childFullSlug = parts[1] + "/" + parts[2];
        return { type: "skills", parentSlug: parts[1], childSlug: childFullSlug };
      }
      return { type: "skills" };
    }
    return null;
  }

  function setHashRoute(route) {
    var pathname = getPathnameNorm();
    var hash = "#";
    if (route) {
      if (route.type === "day") {
        if (currentView === "zaobao") {
          hash += "/zaobao/" + route.dateKey + (route.index1 ? "/" + route.index1 : "/1");
        } else if (isDayPage(pathname) && getDayPageDateKey(pathname) === route.dateKey) {
          hash += String(route.index1 || 1);
        } else {
          hash += "/day/" + route.dateKey + (route.index1 ? "/" + route.index1 : "");
        }
      } else if (route.type === "zaobao") {
        hash += "/zaobao";
        if (route.dateKey) hash += "/" + route.dateKey + "/" + (route.index1 || 1);
      } else if (route.type === "tag") {
        hash += "/tag/" + encodeURIComponent(route.tag);
        if (route.dateKey && route.index1) hash += "/" + route.dateKey + "/" + route.index1;
      } else if (route.type === "skills") {
        hash += "/skills";
        if (route.skillSlug) hash += "/" + route.skillSlug;
        else if (route.parentSlug && route.childSlug) {
          var childPart = route.childSlug.indexOf("/") >= 0 ? route.childSlug.split("/")[1] : route.childSlug;
          hash += "/" + route.parentSlug + "/" + childPart;
        } else if (route.parentSlug) hash += "/" + route.parentSlug;
      }
    }
    var fullHash = hash === "#" ? "" : hash;
    if (window.location.hash !== fullHash) {
      window.history.pushState(null, "", (fullHash ? window.location.pathname + window.location.search + fullHash : window.location.pathname + window.location.search));
    }
  }

  /** 根据当前 route 更新主导航高亮：仅 #/zaobao 时高亮早报，仅 #/skills 时高亮 Skills，首页/日/标签不高亮早报 */
  function updateNavHighlight(route) {
    var zaobaoLink = document.querySelector(".nav-link-zaobao");
    var skillsLink = document.querySelector(".nav-link-skills");
    if (zaobaoLink) zaobaoLink.classList.toggle("is-active", !!(route && route.type === "zaobao"));
    if (skillsLink) skillsLink.classList.toggle("is-active", !!(route && route.type === "skills"));
  }

  /** 从早报 DATA 中提取 skill 的 title/tags/summary/install/repoUrl（首次引用为准） */
  var skillMetaCache = null;
  function getSkillMetaFromData() {
    if (skillMetaCache) return skillMetaCache;
    var out = {};
    var dateKeys = Object.keys(DATA).sort();
    for (var d = 0; d < dateKeys.length; d++) {
      var dateKey = dateKeys[d];
      var day = DATA[dateKey];
      if (!day || !day.items) continue;
      for (var i = 0; i < day.items.length; i++) {
        var item = day.items[i];
        var ref = item.contentRef;
        if (!ref || typeof ref !== "string" || ref.indexOf("skills/") !== 0 || ref.indexOf(".md") !== ref.length - 3) continue;
        var slug = ref.replace(/^skills\//, "").replace(/\.md$/, "");
        if (out[slug]) continue;
        out[slug] = {
          title: item.title || slug,
          tags: item.tags || [],
          summary: item.summary || "",
          install: item.install || "",
          repoUrl: item.repoUrl || "",
          firstDateKey: dateKey
        };
      }
    }
    skillMetaCache = out;
    return out;
  }

  function renderSkillsView(route) {
    var tabsEl = document.getElementById("skills-category-tabs");
    var childrenEl = document.getElementById("skills-children-list");
    var listEl = document.getElementById("skills-skill-list");
    var titleEl = document.getElementById("skills-detail-title");
    var tagsEl = document.getElementById("skills-detail-tags");
    var metaEl = document.getElementById("skills-detail-meta");
    var summaryEl = document.getElementById("skills-detail-summary");
    var metaExtraEl = document.getElementById("skills-detail-meta-extra");
    var bodyEl = document.getElementById("skills-detail-body");
    var noContentEl = document.getElementById("skills-no-content");
    if (!tabsEl || !childrenEl || !listEl) return;

    var tree = CATEGORY_TREE;
    if (!tree || tree.length === 0) return;

    var parentSlug = route.parentSlug;
    var childSlug = route.childSlug;
    var skillSlug = route.skillSlug || null;

    if (skillSlug) {
      for (var s = 0; s < SKILLS.length; s++) {
        if (SKILLS[s].slug === skillSlug && SKILLS[s].categorySlugs && SKILLS[s].categorySlugs[0]) {
          var full = SKILLS[s].categorySlugs[0];
          var segs = full.split("/");
          parentSlug = segs[0];
          childSlug = full;
          break;
        }
      }
    }
    if (!parentSlug) parentSlug = tree[0].slug;
    var parent = tree.filter(function (p) { return p.slug === parentSlug; })[0];
    if (!parent) parent = tree[0];
    parentSlug = parent.slug;
    if (!childSlug && parent.children && parent.children.length > 0) childSlug = parent.children[0].fullSlug;
    var child = parent.children && parent.children.filter(function (c) { return c.fullSlug === childSlug; })[0];
    if (!child && parent.children && parent.children.length > 0) {
      child = parent.children[0];
      childSlug = child.fullSlug;
    }

    tabsEl.innerHTML = "";
    tree.forEach(function (p) {
      var a = document.createElement("a");
      a.href = "#/skills/" + p.slug;
      a.className = "skills-category-tab year-tab" + (p.slug === parentSlug ? " is-active" : "");
      a.setAttribute("role", "tab");
      a.textContent = p.nameZh || p.name;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        setHashRoute({ type: "skills", parentSlug: p.slug });
        applyRoute({ type: "skills", parentSlug: p.slug });
      });
      tabsEl.appendChild(a);
    });

    childrenEl.innerHTML = "";
    if (parent.children) {
      parent.children.forEach(function (c) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#/skills/" + c.fullSlug;
        a.className = "skills-child-link" + (c.fullSlug === childSlug ? " is-active" : "");
        a.textContent = c.nameZh || c.name;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          setHashRoute({ type: "skills", parentSlug: parentSlug, childSlug: c.fullSlug });
          applyRoute({ type: "skills", parentSlug: parentSlug, childSlug: c.fullSlug });
        });
        li.appendChild(a);
        childrenEl.appendChild(li);
      });
    }

    var skillsInCategory = (childSlug && SKILLS_BY_CATEGORY[childSlug]) ? SKILLS_BY_CATEGORY[childSlug] : [];
    listEl.innerHTML = "";
    var skillMeta = getSkillMetaFromData();
    skillsInCategory.forEach(function (s) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#/skills/" + encodeURIComponent(s.slug);
      a.className = "skill-list-link-inner" + (s.slug === skillSlug ? " is-active" : "");
      a.textContent = (skillMeta[s.slug] && skillMeta[s.slug].title) || SKILLS_SLUG_TO_NAME[s.slug] || s.name || s.slug;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        setHashRoute({ type: "skills", skillSlug: s.slug });
        applyRoute({ type: "skills", skillSlug: s.slug });
      });
      li.appendChild(a);
      listEl.appendChild(li);
    });

    if (skillSlug && (SKILL_CONTENT[skillSlug] || getSkillMetaFromData()[skillSlug])) {
      var meta = getSkillMetaFromData()[skillSlug] || {};
      var title = meta.title || SKILLS_SLUG_TO_NAME[skillSlug] || skillSlug;
      if (noContentEl) noContentEl.classList.add("hidden");
      if (titleEl) { titleEl.textContent = title; titleEl.classList.remove("hidden"); }
      if (tagsEl) {
        tagsEl.innerHTML = "";
        (meta.tags || []).forEach(function (tagName) {
          var a = document.createElement("a");
          a.href = "/#/tag/" + encodeURIComponent(tagName) + "/";
          a.className = "tag";
          a.textContent = tagName;
          tagsEl.appendChild(a);
        });
        tagsEl.classList.toggle("hidden", !(meta.tags && meta.tags.length));
      }
      if (metaEl) {
        metaEl.classList.remove("hidden");
        var dateSpan = document.getElementById("skills-detail-date");
        var sepSpan = metaEl.querySelector(".detail-meta-sep");
        if (meta.firstDateKey) {
          if (dateSpan) { dateSpan.textContent = formatDateLine(meta.firstDateKey); dateSpan.classList.remove("hidden"); }
          if (sepSpan) sepSpan.classList.remove("hidden");
        } else {
          if (dateSpan) { dateSpan.textContent = ""; dateSpan.classList.add("hidden"); }
          if (sepSpan) sepSpan.classList.add("hidden");
        }
      }
      if (summaryEl) {
        summaryEl.textContent = meta.summary || "";
        summaryEl.classList.toggle("hidden", !meta.summary);
      }
      if (metaExtraEl) {
        metaExtraEl.innerHTML = "";
        var hasExtra = false;
        if (meta.install) {
          hasExtra = true;
          var dt1 = document.createElement("dt");
          dt1.textContent = "安装：";
          var dd1 = document.createElement("dd");
          var code1 = document.createElement("code");
          code1.className = "detail-meta-install";
          code1.textContent = meta.install;
          dd1.appendChild(code1);
          metaExtraEl.appendChild(dt1);
          metaExtraEl.appendChild(dd1);
        }
        if (meta.repoUrl) {
          hasExtra = true;
          var dt2 = document.createElement("dt");
          dt2.textContent = "仓库：";
          var dd2 = document.createElement("dd");
          var a2 = document.createElement("a");
          a2.href = meta.repoUrl;
          a2.target = "_blank";
          a2.rel = "noopener noreferrer";
          a2.textContent = meta.repoUrl;
          dd2.appendChild(a2);
          metaExtraEl.appendChild(dt2);
          metaExtraEl.appendChild(dd2);
        }
        metaExtraEl.classList.toggle("hidden", !hasExtra);
      }
      if (bodyEl) {
        bodyEl.innerHTML = SKILL_CONTENT[skillSlug] || "<p>暂无正文。</p>";
        bodyEl.classList.remove("hidden");
        bodyEl.querySelectorAll("pre").forEach(function (pre) {
          if (pre.closest(".code-block-wrap")) return;
          var wrap = document.createElement("div");
          wrap.className = "code-block-wrap";
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "code-copy-btn";
          btn.textContent = "复制";
          btn.setAttribute("aria-label", "复制代码");
          btn.addEventListener("click", function () {
            var text = pre.innerText || pre.textContent || "";
            navigator.clipboard.writeText(text).then(
              function () { btn.textContent = "已复制"; btn.classList.add("copied"); setTimeout(function () { btn.textContent = "复制"; btn.classList.remove("copied"); }, 1500); },
              function () { btn.textContent = "复制失败"; }
            );
          });
          pre.parentNode.insertBefore(wrap, pre);
          wrap.appendChild(pre);
          wrap.appendChild(btn);
        });
      }
    } else {
      if (noContentEl) noContentEl.classList.remove("hidden");
      if (titleEl) titleEl.classList.add("hidden");
      if (tagsEl) tagsEl.classList.add("hidden");
      if (metaEl) metaEl.classList.add("hidden");
      if (summaryEl) summaryEl.classList.add("hidden");
      if (metaExtraEl) metaExtraEl.classList.add("hidden");
      if (bodyEl) { bodyEl.innerHTML = ""; bodyEl.classList.add("hidden"); }
    }
  }

  function applyRoute(route) {
    if (!route) return false;
    skipNextHashChange = true;
    if (route.type === "day") {
      currentView = "home";
      document.body.classList.remove("is-zaobao-view");
      document.body.classList.remove("is-skills-view");
      var dateKey = route.dateKey;
      if (!DATA[dateKey]) { skipNextHashChange = false; return false; }
      renderList(dateKey);
      var idx = (route.index1 || 1) - 1;
      var items = DATA[dateKey].items || [];
      if (idx >= 0 && idx < items.length) {
        document.querySelectorAll("#item-list .item-link").forEach(function (el, i) {
          el.classList.toggle("is-active", i === idx);
        });
        renderDetail(dateKey, idx);
      }
      setHashRoute(route);
      setTimeout(function () { skipNextHashChange = false; }, 0);
      updateNavHighlight(route);
      return true;
    }
    if (route.type === "tag") {
      currentView = "home";
      document.body.classList.remove("is-zaobao-view");
      document.body.classList.remove("is-skills-view");
      var tag = route.tag;
      var entries = TAGS[tag] || [];
      if (entries.length === 0) { skipNextHashChange = false; return false; }
      renderList(null, tag);
      if (route.dateKey && route.index1) {
        var found = -1;
        entries.forEach(function (entry, i) {
          if (entry.dateKey === route.dateKey && entry.index + 1 === route.index1) found = i;
        });
        if (found >= 0) {
          document.querySelectorAll("#item-list .item-link").forEach(function (el, i) {
            el.classList.toggle("is-active", i === found);
          });
          var e = entries[found];
          renderDetail(null, 0, e.item, e.dateKey);
          selectHeatmapDate(e.dateKey);
        }
      }
      setHashRoute(route);
      setTimeout(function () { skipNextHashChange = false; }, 0);
      updateNavHighlight(route);
      return true;
    }
    if (route.type === "zaobao") {
      currentView = "zaobao";
      document.body.classList.remove("is-skills-view");
      document.body.classList.add("is-zaobao-view");
      var dateKey = route.dateKey;
      var curYear = new Date().getFullYear();
      var yearStr = String(curYear);
      var defaultYear = (daysByYear[yearStr] && daysByYear[yearStr].length > 0) ? curYear : (YEARS_LIST[0] || curYear);
      var firstDateOfYear = (daysByYear[String(defaultYear)] && daysByYear[String(defaultYear)].length > 0) ? daysByYear[String(defaultYear)][0] : (Object.keys(DATA).sort().reverse()[0] || todayKey());
      var today = todayKey();
      var dayToShow = (dateKey && DATA[dateKey]) ? dateKey : (DATA[today] ? today : firstDateOfYear);
      var index1 = route.index1 || 1;
      if (dateKey && DATA[dateKey]) {
        var idx = (index1 || 1) - 1;
        var items = DATA[dateKey].items || [];
        if (idx >= 0 && idx < items.length) {
          renderList(dateKey);
          document.querySelectorAll("#item-list .item-link").forEach(function (el, i) {
            el.classList.toggle("is-active", i === idx);
          });
          renderDetail(dateKey, idx);
        } else {
          renderList(dayToShow);
          renderDetail(dayToShow, 0);
          index1 = 1;
          dayToShow = dateKey;
        }
      } else {
        renderList(dayToShow);
        renderDetail(dayToShow, 0);
        index1 = 1;
        dayToShow = dayToShow;
      }
      setHashRoute({ type: "zaobao", dateKey: dayToShow, index1: index1 });
      var y = getYearFromDateKey(dayToShow);
      if (y) switchYear(parseInt(y, 10));
      renderYearDaysList(parseInt(getYearFromDateKey(dayToShow), 10) || (YEARS_LIST[0] || new Date().getFullYear()));
      selectYearDay(dayToShow);
      setTimeout(function () { skipNextHashChange = false; }, 0);
      updateNavHighlight(route);
      return true;
    }
    if (route.type === "skills") {
      if (!CATEGORY_TREE || CATEGORY_TREE.length === 0) { skipNextHashChange = false; return false; }
      currentView = "home";
      document.body.classList.remove("is-zaobao-view");
      document.body.classList.add("is-skills-view");
      var tree = CATEGORY_TREE;
      var parentSlug = route.parentSlug;
      var childSlug = route.childSlug;
      var skillSlug = route.skillSlug || null;
      if (skillSlug) {
        for (var s = 0; s < SKILLS.length; s++) {
          if (SKILLS[s].slug === skillSlug && SKILLS[s].categorySlugs && SKILLS[s].categorySlugs[0]) {
            var full = SKILLS[s].categorySlugs[0];
            var segs = full.split("/");
            parentSlug = segs[0];
            childSlug = full;
            break;
          }
        }
      }
      if (!parentSlug) parentSlug = tree[0].slug;
      var parent = tree.filter(function (p) { return p.slug === parentSlug; })[0];
      if (!parent) parent = tree[0];
      parentSlug = parent.slug;
      if (!childSlug && parent.children && parent.children.length > 0) childSlug = parent.children[0].fullSlug;
      var child = parent.children && parent.children.filter(function (c) { return c.fullSlug === childSlug; })[0];
      if (!child && parent.children && parent.children.length > 0) {
        child = parent.children[0];
        childSlug = child.fullSlug;
      }
      var skillsInCat = SKILLS_BY_CATEGORY[childSlug] || [];
      if (!skillSlug && skillsInCat.length > 0) skillSlug = skillsInCat[0].slug;
      var norm = { type: "skills", parentSlug: parentSlug, childSlug: childSlug };
      if (skillSlug) norm.skillSlug = skillSlug;
      setHashRoute(norm);
      renderSkillsView(norm);
      var siteTitle = window.ZAOBAO_SITE_TITLE || "";
      if (skillSlug && siteTitle) {
        var skillMeta = getSkillMetaFromData()[skillSlug];
        var skillTitle = (skillMeta && skillMeta.title) || SKILLS_SLUG_TO_NAME[skillSlug] || skillSlug;
        document.title = skillTitle + " - " + siteTitle;
      }
      setTimeout(function () { skipNextHashChange = false; }, 0);
      updateNavHighlight(route);
      return true;
    }
    skipNextHashChange = false;
    return false;
  }

  function renderList(dateKey, tag) {
    const listEl = document.getElementById("item-list");
    const detailEl = document.getElementById("detail-body");
    const detailMetaEl = document.getElementById("detail-meta");
    const detailTitleEl = document.getElementById("detail-title");
    const detailTagsEl = document.getElementById("detail-tags");
    const emptyEl = document.getElementById("empty-state");
    const dayTitleEl = document.getElementById("day-title");

    if (!listEl) return;

    document.body.classList.remove("is-skills-view");
    document.querySelectorAll("#tags-list .tag.tag-skills").forEach(function (t) {
      t.classList.remove("is-active");
    });

    listEl.innerHTML = "";
    document.querySelectorAll(".heatmap-wrap .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });

    if (tag != null) {
      currentTag = tag;
      dayTitleEl.textContent = tag;
      const entries = TAGS[tag] || [];
      const tagSkills = TAG_SKILLS[tag] || [];
      if (entries.length === 0 && tagSkills.length === 0) {
        detailEl.classList.add("hidden");
        if (detailMetaEl) detailMetaEl.classList.add("hidden");
        var summaryEl = document.getElementById("detail-summary");
        if (summaryEl) summaryEl.classList.add("hidden");
        if (detailTitleEl) detailTitleEl.classList.add("hidden");
        if (detailTagsEl) detailTagsEl.classList.add("hidden");
        if (emptyEl) {
          emptyEl.classList.remove("hidden");
          emptyEl.textContent = "该标签下暂无内容。";
        }
        return;
      }
      if (emptyEl) emptyEl.classList.add("hidden");
      entries.forEach(function (entry, idx) {
        const item = entry.item;
        const li = document.createElement("li");
        const a = document.createElement("a");
        var routeHash = "#/tag/" + encodeURIComponent(tag) + "/" + entry.dateKey + "/" + (entry.index + 1);
        a.href = routeHash;
        a.dataset.tag = tag;
        a.dataset.tagIndex = String(idx);
        a.className = "item-link" + (idx === 0 ? " is-active" : "");
        a.textContent = item.title || "无标题";
        a.title = item.title || "无标题";
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var idx = parseInt(this.dataset.tagIndex, 10);
          var chosen = entries[idx];
          skipNextHashChange = true;
          setHashRoute({ type: "tag", tag: tag, dateKey: chosen.dateKey, index1: chosen.index + 1 });
          document.querySelectorAll("#item-list .item-link.is-active").forEach(function (x) {
            x.classList.remove("is-active");
          });
          this.classList.add("is-active");
          renderDetail(null, 0, chosen.item, chosen.dateKey);
          selectHeatmapDate(chosen.dateKey);
          setTimeout(function () { skipNextHashChange = false; }, 0);
        });
        li.appendChild(a);
        listEl.appendChild(li);
      });
      if (tagSkills.length > 0) {
        var sep = document.createElement("li");
        sep.className = "tag-list-sep";
        sep.textContent = "Skills";
        listEl.appendChild(sep);
        tagSkills.forEach(function (skill, idx) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = "/#/skills/" + encodeURIComponent(skill.slug);
          a.className = "item-link item-link-skill" + (entries.length === 0 && idx === 0 ? " is-active" : "");
          a.textContent = skill.name || skill.slug;
          a.title = skill.description || skill.name || skill.slug;
          li.appendChild(a);
          listEl.appendChild(li);
        });
      }
      detailEl.classList.remove("hidden");
      if (detailMetaEl) detailMetaEl.classList.remove("hidden");
      if (detailTitleEl) detailTitleEl.classList.remove("hidden");
      if (detailTagsEl) detailTagsEl.classList.remove("hidden");
      if (entries.length > 0) {
        renderDetail(null, 0, entries[0].item, entries[0].dateKey);
        selectHeatmapDate(entries[0].dateKey);
      } else if (tagSkills.length > 0) {
        if (detailEl) detailEl.innerHTML = "<p class=\"tag-only-skills-hint\">点击左侧技能链接查看详情。</p>";
      }
      return;
    }

    currentTag = null;
    const day = DATA[dateKey];
    const isToday = dateKey === todayKey();
    dayTitleEl.textContent = isToday ? "今日早报" : formatDateTitle(dateKey) + " 早报";
    selectYearDay(dateKey);
    var y = getYearFromDateKey(dateKey);
    if (y) switchYear(parseInt(y, 10));
    if (!day || !day.items || day.items.length === 0) {
      detailEl.classList.add("hidden");
      if (detailMetaEl) detailMetaEl.classList.add("hidden");
      if (detailTitleEl) detailTitleEl.classList.add("hidden");
      if (detailTagsEl) detailTagsEl.classList.add("hidden");
      if (emptyEl) {
        emptyEl.classList.remove("hidden");
        emptyEl.textContent = "该日暂无早报。";
      }
      return;
    }

    if (emptyEl) emptyEl.classList.add("hidden");
    day.items.forEach((item, idx) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      var pathname = getPathnameNorm();
      var isZaobao = currentView === "zaobao";
      a.href = isDayPage(pathname) ? "#" + (idx + 1) : (isZaobao ? "#/zaobao/" + dateKey + "/" + (idx + 1) : "#/day/" + dateKey + "/" + (idx + 1));
      a.dataset.date = dateKey;
      a.dataset.index = String(idx);
      a.className = "item-link" + (idx === 0 ? " is-active" : "");
      a.textContent = item.title || "无标题";
      a.title = item.title || "无标题";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        skipNextHashChange = true;
        var routeToSet = isZaobao ? { type: "zaobao", dateKey: dateKey, index1: idx + 1 } : { type: "day", dateKey: dateKey, index1: idx + 1 };
        setHashRoute(routeToSet);
        document.querySelectorAll("#item-list .item-link.is-active").forEach((x) => x.classList.remove("is-active"));
        this.classList.add("is-active");
        renderDetail(dateKey, parseInt(this.dataset.index, 10));
        if (!isZaobao) selectHeatmapDate(dateKey);
        setTimeout(function () { skipNextHashChange = false; }, 0);
      });
      li.appendChild(a);
      listEl.appendChild(li);
    });

    detailEl.classList.remove("hidden");
    if (detailMetaEl) detailMetaEl.classList.remove("hidden");
    if (detailTitleEl) detailTitleEl.classList.remove("hidden");
    if (detailTagsEl) detailTagsEl.classList.remove("hidden");
    renderDetail(dateKey, 0);
    selectHeatmapDate(dateKey);
  }

  function renderDetail(dateKey, index, itemOverride, displayDateKey) {
    const detailEl = document.getElementById("detail-body");
    const detailTitleEl = document.getElementById("detail-title");
    const detailTagsEl = document.getElementById("detail-tags");
    const item = itemOverride || (DATA[dateKey] && DATA[dateKey].items && DATA[dateKey].items[index]);
    if (!item) return;
    if (detailTitleEl) {
      detailTitleEl.textContent = item.title || "无标题";
    }
    var siteTitle = window.ZAOBAO_SITE_TITLE || "";
    var pathNorm = getPathnameNorm();
    if (siteTitle && (pathNorm === "" || pathNorm === "index.html")) {
      document.title = (item.title || "无标题") + " - " + siteTitle;
    }
    if (detailTagsEl) {
      detailTagsEl.innerHTML = "";
      var tags = item.tags || [];
      tags.forEach(function (tagName) {
        var count = (TAGS[tagName] || []).length;
        var rangeClass = count <= 4 ? "tag-range-1" : count <= 10 ? "tag-range-2" : count <= 30 ? "tag-range-3" : "tag-range-4";
        var a = document.createElement("a");
        a.href = "#";
        a.className = "tag " + rangeClass + (tagName === currentTag ? " is-active" : "");
        a.dataset.tag = tagName;
        a.textContent = tagName;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          switchTag(tagName);
          renderList(null, tagName);
        });
        detailTagsEl.appendChild(a);
      });
      detailTagsEl.classList.toggle("hidden", tags.length === 0);
    }
    var viewsEl = document.querySelector("#detail-meta .detail-views");
    if (viewsEl) {
      var pathname = window.location.pathname || "";
      var isDayOrIndex = /^\/day\/[^/]+\/?$/.test(pathname) || pathname === "/" || pathname === "/index.html";
      if (isDayOrIndex && index > 0) {
        viewsEl.innerHTML = "阅读 — 次";
      }
    }
    var summaryEl = document.getElementById("detail-summary");
    if (summaryEl) {
      var summaryText = item.summary || "";
      summaryEl.textContent = summaryText;
      summaryEl.classList.toggle("hidden", !summaryText);
    }
    var metaExtraEl = document.getElementById("detail-meta-extra");
    if (metaExtraEl) {
      metaExtraEl.innerHTML = "";
      var hasExtra = false;
      if (item.install) {
        hasExtra = true;
        var dt1 = document.createElement("dt");
        dt1.textContent = "安装：";
        var dd1 = document.createElement("dd");
        var code1 = document.createElement("code");
        code1.className = "detail-meta-install";
        code1.textContent = item.install;
        dd1.appendChild(code1);
        metaExtraEl.appendChild(dt1);
        metaExtraEl.appendChild(dd1);
      }
      if (item.repoUrl) {
        hasExtra = true;
        var dt2 = document.createElement("dt");
        dt2.textContent = "仓库：";
        var dd2 = document.createElement("dd");
        var a2 = document.createElement("a");
        a2.href = item.repoUrl;
        a2.target = "_blank";
        a2.rel = "noopener noreferrer";
        a2.textContent = item.repoUrl;
        dd2.appendChild(a2);
        metaExtraEl.appendChild(dt2);
        metaExtraEl.appendChild(dd2);
      }
      metaExtraEl.classList.toggle("hidden", !hasExtra);
    }
    detailEl.innerHTML = item.contentHtml || "<p>暂无正文。</p>";
    detailEl.querySelectorAll("pre").forEach(function (pre) {
      if (pre.closest(".code-block-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "code-block-wrap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn";
      btn.textContent = "复制";
      btn.setAttribute("aria-label", "复制代码");
      btn.addEventListener("click", function () {
        const text = pre.innerText || pre.textContent || "";
        navigator.clipboard.writeText(text).then(
          function () {
            btn.textContent = "已复制";
            btn.classList.add("copied");
            setTimeout(function () {
              btn.textContent = "复制";
              btn.classList.remove("copied");
            }, 1500);
          },
          function () {
            btn.textContent = "复制失败";
          }
        );
      });
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wrap.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }
  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function switchYear(year) {
    document.querySelectorAll(".year-tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.year === String(year));
    });
    var heatmapYear = document.querySelector(".heatmap-year");
    if (heatmapYear) {
      document.querySelectorAll(".heatmap-year").forEach((el) => {
        el.classList.toggle("is-active", el.dataset.year === String(year));
      });
    }
    const countEl = document.getElementById("year-count");
    if (countEl) countEl.textContent = TOTAL_BY_YEAR[year] || 0;
  }

  function switchTag(tag) {
    document.querySelectorAll("#tags-list .tag").forEach((t) => {
      t.classList.toggle("is-active", (t.dataset.tag || "") === (tag || ""));
    });
    if (!tag) {
    }
  }

  function init() {
    var pathname = getPathnameNorm();
    if (isArticlePage(pathname)) {
      var route = getHashRoute();
      if (route) {
        var newPath = "/day/" + route.dateKey + "/";
        var newHash = route.type === "day" ? "#" + (route.index1 || 1) : "#/tag/" + encodeURIComponent(route.tag) + (route.dateKey && route.index1 ? "/" + route.dateKey + "/" + route.index1 : "");
        window.location.replace(newPath + newHash);
        return;
      }
      return;
    }

    const today = todayKey();
    const hasToday = !!DATA[today];
    const defaultDate = hasToday ? today : Object.keys(DATA).sort().reverse()[0] || today;

    document.getElementById("theme-light")?.addEventListener("click", function () {
      applyTheme("light");
    });
    document.getElementById("theme-dark")?.addEventListener("click", function () {
      applyTheme("dark");
    });

    document.querySelectorAll(".year-tab").forEach((btn) => {
      btn.addEventListener("click", function () {
        var y = Number(this.dataset.year);
        switchYear(y);
        renderYearDaysList(y);
        if (currentView === "zaobao") {
          var dates = daysByYear[String(y)] || [];
          if (dates.length > 0) {
            var firstDate = dates[0];
            skipNextHashChange = true;
            setHashRoute({ type: "zaobao", dateKey: firstDate, index1: 1 });
            renderList(firstDate);
            renderDetail(firstDate, 0);
            document.querySelectorAll("#item-list .item-link").forEach(function (el, i) {
              el.classList.toggle("is-active", i === 0);
            });
            selectYearDay(firstDate);
            setTimeout(function () { skipNextHashChange = false; }, 0);
          }
        }
      });
    });

    var yearDaysWrap = document.querySelector(".year-days-wrap");
    if (yearDaysWrap) {
      yearDaysWrap.addEventListener("scroll", function () {
        onYearDaysScroll();
      });
    }

    document.querySelectorAll(".heatmap-wrap .cell.has-data, .heatmap-wrap .cell.is-today").forEach((cell) => {
      cell.addEventListener("click", function (e) {
        const dateKey = this.dataset.date;
        if (dateKey) {
          e.preventDefault();
          var pathname = getPathnameNorm();
          // 在日页且点击的是另一天：跳转到该日的日页（保留 /day/ 直达与 SEO）
          if (isDayPage(pathname) && getDayPageDateKey(pathname) !== dateKey) {
            window.location.href = "/day/" + dateKey + "/#1";
            return;
          }
          // 其余情况（首页或日页同一天）：只改 hash + 渲染，不整页跳转
          skipNextHashChange = true;
          setHashRoute({ type: "day", dateKey: dateKey, index1: 1 });
          renderList(dateKey);
          selectHeatmapDate(dateKey);
          setTimeout(function () { skipNextHashChange = false; }, 0);
        }
      });
    });

    document.getElementById("tags-list")?.addEventListener("click", function (e) {
      const tagEl = e.target.closest(".tag");
      if (!tagEl) return;
      const tag = tagEl.dataset.tag || "";
      const pathNorm = getPathnameNorm();
      const isIndex = pathNorm === "" || pathNorm === "index.html";
      if (!isIndex) {
        e.preventDefault();
        var hash = "#/tag/" + encodeURIComponent(tag);
        var entries = TAGS[tag] || [];
        if (entries.length > 0) hash += "/" + entries[0].dateKey + "/" + (entries[0].index + 1);
        window.location.href = "/" + hash;
        return;
      }
      e.preventDefault();
      switchTag(tag);
      if (tag) {
        skipNextHashChange = true;
        setHashRoute({ type: "tag", tag: tag });
        renderList(null, tag);
        var entries = TAGS[tag] || [];
        if (entries.length > 0) {
          setHashRoute({ type: "tag", tag: tag, dateKey: entries[0].dateKey, index1: entries[0].index + 1 });
        }
        updateNavHighlight({ type: "tag", tag: tag });
        setTimeout(function () { skipNextHashChange = false; }, 0);
      }
    });

    window.addEventListener("popstate", function () {
      if (skipNextHashChange) return;
      var route = getHashRoute();
      if (route && applyRoute(route)) return;
      var defaultDate = hasToday ? today : Object.keys(DATA).sort().reverse()[0] || today;
      renderList(defaultDate);
    });
    window.addEventListener("hashchange", function () {
      if (skipNextHashChange) return;
      var route = getHashRoute();
      if (route) {
        applyRoute(route);
      } else {
        var pathname = getPathnameNorm();
        if (!isDayPage(pathname)) {
          currentView = "home";
          document.body.classList.remove("is-zaobao-view");
          var today = todayKey();
          var hasToday = !!DATA[today];
          var defaultDate = hasToday ? today : Object.keys(DATA).sort().reverse()[0] || today;
          skipNextHashChange = true;
          renderList(defaultDate);
          setHashRoute({ type: "day", dateKey: defaultDate, index1: 1 });
          var yearToShow = parseInt(defaultDate.slice(0, 4), 10);
          switchYear(yearToShow);
          selectYearDay(defaultDate);
          renderYearDaysList(yearToShow);
          setTimeout(function () { skipNextHashChange = false; }, 0);
        }
      }
      updateNavHighlight(route != null ? route : null);
    });

    (function initResizer() {
      const listEl = document.getElementById("day-list");
      const resizerEl = document.getElementById("day-resizer");
      if (!listEl || !resizerEl) return;
      const KEY = "zaobao-day-list-width";
      const defaultWidth = 160;
      const minW = 160;
      const maxPct = 0.8;
      let startX = 0, startW = 0;
      function loadWidth() {
        const w = parseInt(localStorage.getItem(KEY), 10);
        if (w && w >= minW) {
          listEl.style.width = w + "px";
        }
      }
      function saveWidth(w) {
        if (w >= minW) localStorage.setItem(KEY, String(w));
      }
      loadWidth();
      resizerEl.addEventListener("mousedown", function (e) {
        e.preventDefault();
        startX = e.clientX;
        startW = listEl.offsetWidth;
        function move(e) {
          const dx = e.clientX - startX;
          let w = Math.round(startW + dx);
          const maxW = Math.floor(window.innerWidth * maxPct);
          if (w < minW) w = minW;
          if (w > maxW) w = maxW;
          listEl.style.width = w + "px";
          saveWidth(w);
        }
        function up() {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
    })();

    (function initSkillsResizer() {
      const listEl = document.getElementById("skills-skill-list-wrap");
      const resizerEl = document.getElementById("skills-list-resizer");
      if (!listEl || !resizerEl) return;
      const KEY = "zaobao-skills-list-width";
      const defaultWidth = 160;
      const minW = 160;
      const maxPct = 0.8;
      let startX = 0, startW = 0;
      function loadWidth() {
        const w = parseInt(localStorage.getItem(KEY), 10);
        if (w && w >= minW) {
          listEl.style.width = w + "px";
        }
      }
      function saveWidth(w) {
        if (w >= minW) localStorage.setItem(KEY, String(w));
      }
      loadWidth();
      resizerEl.addEventListener("mousedown", function (e) {
        e.preventDefault();
        startX = e.clientX;
        startW = listEl.offsetWidth;
        function move(e) {
          const dx = e.clientX - startX;
          let w = Math.round(startW + dx);
          const maxW = Math.floor(window.innerWidth * maxPct);
          if (w < minW) w = minW;
          if (w > maxW) w = maxW;
          listEl.style.width = w + "px";
          saveWidth(w);
        }
        function up() {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", up);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
      });
    })();

    (function initDetailImageLightbox() {
      var detailEl = document.getElementById("detail-body");
      var lightbox = document.getElementById("detail-image-lightbox");
      if (!detailEl || !lightbox) return;
      var lbImg = lightbox.querySelector("img");
      detailEl.addEventListener("click", function (e) {
        if (e.target.tagName === "IMG") {
          e.preventDefault();
          lbImg.src = e.target.src;
          lbImg.alt = e.target.alt || "";
          lightbox.classList.remove("hidden");
          lightbox.setAttribute("aria-hidden", "false");
        }
      });
      lightbox.addEventListener("click", function () {
        this.classList.add("hidden");
        this.setAttribute("aria-hidden", "true");
      });
    })();

    var route = getHashRoute();
    var pathname = getPathnameNorm();
    var isIndex = !isDayPage(pathname);
    if (isIndex) {
      currentView = "home";
      document.body.classList.remove("is-zaobao-view");
      var yearToShow = YEARS_LIST.length ? YEARS_LIST[0] : new Date().getFullYear();
      if (route && applyRoute(route)) {
        if (route.type === "day" && route.dateKey) {
          yearToShow = parseInt(getYearFromDateKey(route.dateKey), 10);
          selectYearDay(route.dateKey);
        }
        if (route.type === "zaobao") {
          yearToShow = parseInt(getYearFromDateKey(route.dateKey || defaultDate), 10) || yearToShow;
        }
        if (route.type !== "zaobao") {
          renderYearDaysList(yearToShow);
        }
      } else {
        var initialDate = window.ZAOBAO_DAY_PAGE || defaultDate;
        yearToShow = parseInt(getYearFromDateKey(initialDate), 10) || yearToShow;
        renderList(initialDate);
        setHashRoute({ type: "day", dateKey: initialDate, index1: 1 });
      }
      if (currentView !== "zaobao") {
        renderYearDaysList(yearToShow);
      }
    } else {
      if (route && applyRoute(route)) {
        // 已从 hash 恢复
      } else {
        renderList(defaultDate);
        setHashRoute({ type: "day", dateKey: defaultDate, index1: 1 });
      }
    }
    updateNavHighlight(getHashRoute());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
