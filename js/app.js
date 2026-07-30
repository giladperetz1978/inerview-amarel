/**
 * Amarel Interview Insights PWA – main UI logic
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    view: "home",
    selectedId: null,
    deferredPrompt: null,
  };

  function toast(message, type = "") {
    const el = $("#toast");
    el.textContent = message;
    el.className = `toast show ${type}`.trim();
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove("show");
    }, 2800);
  }

  function setView(name) {
    state.view = name;
    $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === name));
    $$(".nav-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === name)
    );
    if (name === "search") renderResults();
    if (name === "home") refreshHome();
    if (name === "form") {
      refreshDatalists();
      $("#insight-form")?.querySelector("input,select,textarea")?.focus?.();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillSelect(selectEl, values, placeholder) {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);
    values.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      selectEl.appendChild(o);
    });
    if (values.includes(current)) selectEl.value = current;
  }

  function fillDatalist(listEl, values) {
    if (!listEl) return;
    listEl.innerHTML = values
      .map((v) => `<option value="${escapeAttr(v)}"></option>`)
      .join("");
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function refreshDatalists() {
    fillDatalist($("#dl-departments"), Storage.getDepartments());
    fillDatalist($("#dl-jobs"), Storage.getJobs());
    fillDatalist($("#dl-roles"), Storage.getRoles());

    fillSelect($("#filter-department"), Storage.getDepartments(), "כל המחלקות");
    fillSelect($("#filter-job"), Storage.getJobs(), "כל המשרות");
    fillSelect($("#filter-role"), Storage.getRoles(), "כל תפקידי המנהל");

    fillSelect($("#f-department"), Storage.getDepartments(), "בחרו מחלקה");
  }

  function refreshHome() {
    const s = Storage.stats();
    $("#stat-total").textContent = s.total;
    $("#stat-deps").textContent = s.departments;
    $("#stat-jobs").textContent = s.jobs;

    const recent = Storage.getInsights().slice(0, 5);
    const box = $("#recent-list");
    if (!recent.length) {
      box.innerHTML = `
        <div class="empty-state">
          <strong>עדיין אין תובנות במאגר</strong>
          התחילו בהוספת ראיון ראשון מהטאב "הוספה".
        </div>`;
      return;
    }
    box.innerHTML = recent.map(cardHtml).join("");
    bindCardActions(box);
  }

  function snippet(text, max = 140) {
    const t = String(text || "").trim();
    if (!t) return "";
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }

  function cardHtml(item) {
    const bits = [item.insights, item.situations, item.cases]
      .map((x) => snippet(x, 100))
      .filter(Boolean);
    const preview = bits[0] || "ללא תוכן נוסף";
    return `
      <article class="insight-card" data-id="${escapeAttr(item.id)}">
        <header>
          <div>
            <h3>${escapeHtml(item.jobTitle)}</h3>
            <div class="meta">
              ${escapeHtml(item.managerName)} · ${escapeHtml(item.department)} ·
              ${escapeHtml(ExportUtil.formatDate(item.createdAt))}
            </div>
          </div>
        </header>
        <div class="tags">
          <span class="tag">${escapeHtml(item.managerRole)}</span>
          <span class="tag">מרואיין: ${escapeHtml(item.intervieweeName)}</span>
        </div>
        <p style="margin:0;color:var(--ink-soft);font-size:0.92rem;">${escapeHtml(preview)}</p>
        <div class="btn-row no-print" style="margin-top:12px;">
          <button type="button" class="btn btn-outline btn-open">פתיחה</button>
          <button type="button" class="btn btn-secondary btn-pdf">PDF</button>
          <button type="button" class="btn btn-secondary btn-mail">Outlook</button>
        </div>
      </article>`;
  }

  function bindCardActions(root) {
    root.querySelectorAll(".insight-card").forEach((card) => {
      const id = card.dataset.id;
      card.querySelector(".btn-open")?.addEventListener("click", () => openDetail(id));
      card.querySelector(".btn-pdf")?.addEventListener("click", () => {
        const item = Storage.getInsightById(id);
        if (item) safePdf(item);
      });
      card.querySelector(".btn-mail")?.addEventListener("click", () => {
        const item = Storage.getInsightById(id);
        if (item) safeMail(item);
      });
    });
  }

  function currentFilters() {
    return {
      q: $("#search-q")?.value || "",
      department: $("#filter-department")?.value || "",
      jobTitle: $("#filter-job")?.value || "",
      managerRole: $("#filter-role")?.value || "",
    };
  }

  function renderResults() {
    refreshDatalists();
    const f = currentFilters();
    const list = Storage.searchInsights(
      { q: f.q },
      {
        department: f.department,
        jobTitle: f.jobTitle,
        managerRole: f.managerRole,
      }
    );
    $("#results-count").textContent = `${list.length} תוצאות`;
    const box = $("#results-list");
    if (!list.length) {
      box.innerHTML = `
        <div class="empty-state">
          <strong>לא נמצאו תוצאות</strong>
          נסו מילת מפתח אחרת או נקו את הסינונים.
        </div>`;
      return;
    }
    box.innerHTML = list.map(cardHtml).join("");
    bindCardActions(box);
  }

  function openDetail(id) {
    const item = Storage.getInsightById(id);
    if (!item) return;
    state.selectedId = id;
    const body = $("#modal-body");
    body.innerHTML = `
      <h3>${escapeHtml(item.jobTitle)}</h3>
      <p class="meta" style="margin-top:0;">
        ${escapeHtml(ExportUtil.formatDate(item.createdAt))}
      </p>
      <div class="tags">
        <span class="tag">${escapeHtml(item.department)}</span>
        <span class="tag">${escapeHtml(item.managerRole)}</span>
      </div>
      <div class="block"><strong>שם המנהל</strong><p>${escapeHtml(item.managerName)}</p></div>
      <div class="block"><strong>שם המרואיין</strong><p>${escapeHtml(item.intervieweeName)}</p></div>
      ${
        item.insights
          ? `<div class="block"><strong>תובנות מהראיון</strong><p>${escapeHtml(item.insights)}</p></div>`
          : ""
      }
      ${
        item.situations
          ? `<div class="block"><strong>סיטואציות</strong><p>${escapeHtml(item.situations)}</p></div>`
          : ""
      }
      ${
        item.cases
          ? `<div class="block"><strong>מקרים ותגובות</strong><p>${escapeHtml(item.cases)}</p></div>`
          : ""
      }
      <div class="detail-actions no-print">
        <button type="button" class="btn btn-primary" id="modal-pdf">ייצוא PDF</button>
        <button type="button" class="btn btn-secondary" id="modal-mail">Outlook</button>
        <button type="button" class="btn btn-outline" id="modal-close-2">סגירה</button>
        <button type="button" class="btn btn-danger" id="modal-delete">מחיקה</button>
      </div>`;
    $("#modal").classList.add("open");
    $("#modal-pdf").onclick = () => safePdf(item);
    $("#modal-mail").onclick = () => safeMail(item);
    $("#modal-close-2").onclick = closeModal;
    $("#modal-delete").onclick = async () => {
      if (!confirm("למחוק את הרשומה מהמאגר?")) return;
      await Storage.deleteInsight(id);
      closeModal();
      toast("הרשומה נמחקה", "success");
      refreshHome();
      renderResults();
    };
  }

  function closeModal() {
    $("#modal").classList.remove("open");
    state.selectedId = null;
  }

  function safePdf(item) {
    try {
      ExportUtil.exportPdf(item);
      toast("נפתח חלון הדפסה / שמירה ל-PDF");
    } catch (e) {
      toast(e.message || "שגיאה בייצוא PDF", "error");
    }
  }

  function safeMail(item) {
    try {
      ExportUtil.exportOutlook(item);
      toast("נפתח מייל ב-Outlook / תוכנת הדואר");
    } catch (e) {
      toast(e.message || "שגיאה בפתיחת Outlook", "error");
    }
  }

  function validateForm(data) {
    const required = [
      ["managerName", "שם המנהל"],
      ["managerRole", "תפקיד המנהל"],
      ["department", "מחלקה"],
      ["jobTitle", "שם המשרה"],
      ["intervieweeName", "שם המרואיין"],
    ];
    for (const [key, label] of required) {
      if (!String(data[key] || "").trim()) {
        return `יש למלא: ${label}`;
      }
    }
    const hasContent = [data.insights, data.situations, data.cases].some(
      (x) => String(x || "").trim()
    );
    if (!hasContent) {
      return "יש למלא לפחות אחד מבין: תובנות / סיטואציות / מקרים ותגובות";
    }
    return null;
  }

  function readForm() {
    return {
      managerName: $("#f-manager-name").value,
      managerRole: $("#f-manager-role").value,
      department: $("#f-department").value || $("#f-department-new").value,
      jobTitle: $("#f-job").value,
      intervieweeName: $("#f-interviewee").value,
      insights: $("#f-insights").value,
      situations: $("#f-situations").value,
      cases: $("#f-cases").value,
    };
  }

  function resetForm() {
    $("#insight-form").reset();
    $("#f-department-new").value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    const data = readForm();

    // free-text department addition
    if ($("#f-department-new").value.trim()) {
      data.department = $("#f-department-new").value.trim();
      Storage.addDepartment(data.department);
    }

    const err = validateForm(data);
    if (err) {
      toast(err, "error");
      return;
    }

    const btn = $("#btn-save");
    btn.disabled = true;
    try {
      const saved = await Storage.saveInsight(data);
      resetForm();
      refreshDatalists();
      toast("נשמר במאגר בהצלחה", "success");
      setView("home");
      openDetail(saved.id);
    } catch (ex) {
      console.error(ex);
      toast("שגיאה בשמירה", "error");
    } finally {
      btn.disabled = false;
    }
  }

  function bindEvents() {
    $$(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.nav));
    });

    $("#btn-go-add")?.addEventListener("click", () => setView("form"));
    $("#btn-go-search")?.addEventListener("click", () => setView("search"));

    $("#insight-form")?.addEventListener("submit", onSubmit);
    $("#btn-reset")?.addEventListener("click", () => {
      resetForm();
      toast("הטופס נוקה");
    });

    $("#btn-add-department")?.addEventListener("click", () => {
      const name = $("#new-department-name").value.trim();
      if (!name) {
        toast("הזינו שם מחלקה", "error");
        return;
      }
      Storage.addDepartment(name);
      $("#new-department-name").value = "";
      refreshDatalists();
      toast("המחלקה נוספה", "success");
    });

    ["search-q", "filter-department", "filter-job", "filter-role"].forEach(
      (id) => {
        $(`#${id}`)?.addEventListener("input", renderResults);
        $(`#${id}`)?.addEventListener("change", renderResults);
      }
    );

    $("#btn-clear-filters")?.addEventListener("click", () => {
      $("#search-q").value = "";
      $("#filter-department").value = "";
      $("#filter-job").value = "";
      $("#filter-role").value = "";
      renderResults();
    });

    $("#modal-close")?.addEventListener("click", closeModal);
    $("#modal")?.addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal();
    });

    $("#btn-backup")?.addEventListener("click", () => {
      ExportUtil.downloadJsonBackup(Storage.exportAll());
      toast("הגיבוי הורד", "success");
    });

    // PWA install
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      $("#install-banner")?.classList.add("show");
    });

    $("#btn-install")?.addEventListener("click", async () => {
      if (!state.deferredPrompt) return;
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      $("#install-banner")?.classList.remove("show");
    });

    $("#btn-dismiss-install")?.addEventListener("click", () => {
      $("#install-banner")?.classList.remove("show");
    });
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (err) {
      console.warn("SW registration failed", err);
    }
  }

  function init() {
    bindEvents();
    refreshDatalists();
    refreshHome();
    setView("home");
    registerSW();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
