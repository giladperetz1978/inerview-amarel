/**
 * Local storage layer with a future remote API hook.
 * When a server exists, set API_BASE and implement remote methods.
 */
const Storage = (() => {
  const KEYS = {
    insights: "amarel_insights_v1",
    departments: "amarel_departments_v1",
    jobs: "amarel_jobs_v1",
    roles: "amarel_roles_v1",
  };

  /** Future server endpoint, e.g. "https://api.example.com" */
  const API_BASE = null;

  const DEFAULT_DEPARTMENTS = [
    "אינטגרציה",
    "ניסויים",
  ];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return structuredClone(fallback);
      return JSON.parse(raw);
    } catch {
      return structuredClone(fallback);
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensureSeed() {
    const deps = read(KEYS.departments, null);
    if (!deps || !Array.isArray(deps) || deps.length === 0) {
      write(KEYS.departments, DEFAULT_DEPARTMENTS);
    }
    if (!read(KEYS.jobs, null)) write(KEYS.jobs, []);
    if (!read(KEYS.roles, null)) write(KEYS.roles, []);
    if (!read(KEYS.insights, null)) write(KEYS.insights, []);
  }

  function getDepartments() {
    ensureSeed();
    return read(KEYS.departments, DEFAULT_DEPARTMENTS).sort((a, b) =>
      a.localeCompare(b, "he")
    );
  }

  function addDepartment(name) {
    const clean = String(name || "").trim();
    if (!clean) return getDepartments();
    const list = getDepartments();
    if (!list.some((d) => d.toLowerCase() === clean.toLowerCase())) {
      list.push(clean);
      write(KEYS.departments, list);
    }
    return getDepartments();
  }

  function getJobs() {
    ensureSeed();
    return read(KEYS.jobs, []).sort((a, b) => a.localeCompare(b, "he"));
  }

  function addJob(name) {
    const clean = String(name || "").trim();
    if (!clean) return getJobs();
    const list = getJobs();
    if (!list.some((j) => j.toLowerCase() === clean.toLowerCase())) {
      list.push(clean);
      write(KEYS.jobs, list);
    }
    return getJobs();
  }

  function getRoles() {
    ensureSeed();
    return read(KEYS.roles, []).sort((a, b) => a.localeCompare(b, "he"));
  }

  function addRole(name) {
    const clean = String(name || "").trim();
    if (!clean) return getRoles();
    const list = getRoles();
    if (!list.some((r) => r.toLowerCase() === clean.toLowerCase())) {
      list.push(clean);
      write(KEYS.roles, list);
    }
    return getRoles();
  }

  function getInsights() {
    ensureSeed();
    return read(KEYS.insights, []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  function getInsightById(id) {
    return getInsights().find((i) => i.id === id) || null;
  }

  /**
   * Persist insight locally. Ready for POST to API_BASE later.
   */
  async function saveInsight(payload) {
    const item = {
      id: payload.id || uid(),
      managerName: payload.managerName.trim(),
      managerRole: payload.managerRole.trim(),
      department: payload.department.trim(),
      jobTitle: payload.jobTitle.trim(),
      intervieweeName: payload.intervieweeName.trim(),
      insights: (payload.insights || "").trim(),
      situations: (payload.situations || "").trim(),
      cases: (payload.cases || "").trim(),
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    addDepartment(item.department);
    addJob(item.jobTitle);
    addRole(item.managerRole);

    const list = getInsights();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    write(KEYS.insights, list);

    // Future server sync hook
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/insights`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        item.synced = true;
        const updated = getInsights().map((x) =>
          x.id === item.id ? { ...x, synced: true } : x
        );
        write(KEYS.insights, updated);
      } catch (err) {
        console.warn("Server sync deferred:", err);
      }
    }

    return item;
  }

  async function deleteInsight(id) {
    const list = getInsights().filter((x) => x.id !== id);
    write(KEYS.insights, list);
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/insights/${id}`, { method: "DELETE" });
      } catch (err) {
        console.warn("Server delete deferred:", err);
      }
    }
  }

  function searchInsights(query = {}, filters = {}) {
    const q = String(query.q || "")
      .trim()
      .toLowerCase();
    const department = String(filters.department || "").trim();
    const jobTitle = String(filters.jobTitle || "").trim();
    const managerRole = String(filters.managerRole || "").trim();

    return getInsights().filter((item) => {
      if (department && item.department !== department) return false;
      if (jobTitle && item.jobTitle !== jobTitle) return false;
      if (managerRole && item.managerRole !== managerRole) return false;
      if (!q) return true;

      const hay = [
        item.managerName,
        item.managerRole,
        item.department,
        item.jobTitle,
        item.intervieweeName,
        item.insights,
        item.situations,
        item.cases,
      ]
        .join(" ")
        .toLowerCase();

      return q.split(/\s+/).every((token) => hay.includes(token));
    });
  }

  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      insights: getInsights(),
      departments: getDepartments(),
      jobs: getJobs(),
      roles: getRoles(),
    };
  }

  function stats() {
    const insights = getInsights();
    return {
      total: insights.length,
      departments: getDepartments().length,
      jobs: getJobs().length,
    };
  }

  ensureSeed();

  return {
    getDepartments,
    addDepartment,
    getJobs,
    addJob,
    getRoles,
    addRole,
    getInsights,
    getInsightById,
    saveInsight,
    deleteInsight,
    searchInsights,
    exportAll,
    stats,
    API_BASE,
  };
})();
