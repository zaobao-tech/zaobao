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
  var currentTag = null;
  var skipNextHashChange = false;

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

  function formatDateTitle(dateKey) {
    if (!dateKey) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return y + "年" + m + "月" + d + "日 " + weekdays[date.getDay()];
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
    const year = parseInt(dateKey.slice(0, 4), 10);
    switchYear(year);
    document.querySelectorAll(".heatmap-wrap .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
    document.querySelectorAll('.heatmap-wrap .cell[data-date="' + dateKey + '"]').forEach(function (el) {
      el.classList.add("is-selected");
    });
  }

  // Hash 路由：/#/day/dateKey、/#/day/dateKey/n、/#/tag/name、/#/tag/name/dateKey/n（n 为 1-based）
  function getHashRoute() {
    var hash = (window.location.hash || "").replace(/^#/, "");
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
    return null;
  }

  function setHashRoute(route) {
    var hash = "#";
    if (route) {
      if (route.type === "day") {
        hash += "/day/" + route.dateKey + (route.index1 ? "/" + route.index1 : "");
      } else if (route.type === "tag") {
        hash += "/tag/" + encodeURIComponent(route.tag);
        if (route.dateKey && route.index1) hash += "/" + route.dateKey + "/" + route.index1;
      }
    }
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash || window.location.pathname + window.location.search);
    }
  }

  function applyRoute(route) {
    if (!route) return false;
    skipNextHashChange = true;
    if (route.type === "day") {
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
      return true;
    }
    if (route.type === "tag") {
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

    listEl.innerHTML = "";
    document.querySelectorAll(".heatmap-wrap .cell.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });

    if (tag != null) {
      currentTag = tag;
      dayTitleEl.textContent = tag;
      const entries = TAGS[tag] || [];
      if (entries.length === 0) {
        detailEl.classList.add("hidden");
        if (detailMetaEl) detailMetaEl.classList.add("hidden");
        if (detailTitleEl) detailTitleEl.classList.add("hidden");
        if (detailTagsEl) detailTagsEl.classList.add("hidden");
        if (emptyEl) {
          emptyEl.classList.remove("hidden");
          emptyEl.textContent = "该标签下暂无早报。";
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
      detailEl.classList.remove("hidden");
      if (detailMetaEl) detailMetaEl.classList.remove("hidden");
      if (detailTitleEl) detailTitleEl.classList.remove("hidden");
      if (detailTagsEl) detailTagsEl.classList.remove("hidden");
      renderDetail(null, 0, entries[0].item, entries[0].dateKey);
      selectHeatmapDate(entries[0].dateKey);
      return;
    }

    currentTag = null;
    const day = DATA[dateKey];
    const isToday = dateKey === todayKey();
    dayTitleEl.textContent = isToday ? "今日早报" : formatDateTitle(dateKey) + " 早报";
    document.querySelectorAll('.heatmap-wrap .cell[data-date="' + dateKey + '"]').forEach(function (el) {
      el.classList.add("is-selected");
    });
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
      a.href = "#/day/" + dateKey + "/" + (idx + 1);
      a.dataset.date = dateKey;
      a.dataset.index = String(idx);
      a.className = "item-link" + (idx === 0 ? " is-active" : "");
      a.textContent = item.title || "无标题";
      a.title = item.title || "无标题";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        skipNextHashChange = true;
        setHashRoute({ type: "day", dateKey: dateKey, index1: idx + 1 });
        document.querySelectorAll("#item-list .item-link.is-active").forEach((x) => x.classList.remove("is-active"));
        this.classList.add("is-active");
        renderDetail(dateKey, parseInt(this.dataset.index, 10));
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
  }

  function renderDetail(dateKey, index, itemOverride, displayDateKey) {
    const detailEl = document.getElementById("detail-body");
    const detailDateEl = document.getElementById("detail-date");
    const detailTitleEl = document.getElementById("detail-title");
    const detailTagsEl = document.getElementById("detail-tags");
    const item = itemOverride || (DATA[dateKey] && DATA[dateKey].items && DATA[dateKey].items[index]);
    if (!item) return;
    if (detailDateEl) {
      detailDateEl.textContent = displayDateKey ? formatDateLine(displayDateKey) + " | " : "";
    }
    if (detailTitleEl) {
      detailTitleEl.textContent = item.title || "无标题";
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
    document.querySelectorAll(".heatmap-year").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.year === String(year));
    });
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
        switchYear(Number(this.dataset.year));
      });
    });

    document.querySelectorAll(".heatmap-wrap .cell.has-data, .heatmap-wrap .cell.is-today").forEach((cell) => {
      cell.addEventListener("click", function (e) {
        const dateKey = this.dataset.date;
        if (dateKey) {
          e.preventDefault();
          skipNextHashChange = true;
          setHashRoute({ type: "day", dateKey: dateKey });
          renderList(dateKey);
          setTimeout(function () { skipNextHashChange = false; }, 0);
        }
      });
    });

    document.getElementById("tags-list")?.addEventListener("click", function (e) {
      const tagEl = e.target.closest(".tag");
      if (!tagEl) return;
      e.preventDefault();
      const tag = tagEl.dataset.tag || "";
      switchTag(tag);
      if (tag) {
        skipNextHashChange = true;
        setHashRoute({ type: "tag", tag: tag });
        renderList(null, tag);
        var entries = TAGS[tag] || [];
        if (entries.length > 0) {
          setHashRoute({ type: "tag", tag: tag, dateKey: entries[0].dateKey, index1: entries[0].index + 1 });
        }
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
      if (route) applyRoute(route);
    });

    (function initResizer() {
      const listEl = document.getElementById("day-list");
      const resizerEl = document.getElementById("day-resizer");
      if (!listEl || !resizerEl) return;
      const KEY = "zaobao-day-list-width";
      const defaultWidth = 300;
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
    if (route && applyRoute(route)) {
      // 已从 hash 恢复
    } else {
      var initialDate = window.ZAOBAO_DAY_PAGE || defaultDate;
      renderList(initialDate);
      setHashRoute({ type: "day", dateKey: initialDate, index1: 1 });
    }

    // 不蒜子有时会返回全站/默认大数（如 33593136），新站应从 0 开始：异常大则显示 0
    function clampBusuanziPv() {
      var el = document.getElementById("busuanzi_value_page_pv");
      if (!el) return;
      var n = parseInt(el.textContent, 10);
      if (isNaN(n) || n > 1000000) el.textContent = "0";
    }
    clampBusuanziPv();
    var pvEl = document.getElementById("busuanzi_value_page_pv");
    if (pvEl) {
      var observer = new MutationObserver(function () { clampBusuanziPv(); });
      observer.observe(pvEl, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(clampBusuanziPv, 800);
    setTimeout(clampBusuanziPv, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
