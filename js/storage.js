/**
 * Supabase & LocalStorage hybrid implementation for Amarel Interview Insights.
 * Includes Recycle Bin (Trash) functionality with Restore & Permanent Delete.
 */
const Storage = (() => {
  const SUPABASE_URL = "https://esdksihfrirldclboltc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_msrylgqAhtCy0vlbCYXMYQ_vGiyIKVm";
  const LOCAL_KEY = "amarel_insights_v1";
  const TRASH_KEY = "amarel_trash_v1";

  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const DEFAULT_DEPARTMENTS = ["אינטגרציה", "ניסויים"];

  let data = {
    insights: [],
    trash: [],
    departments: [],
    jobs: [],
    roles: []
  };

  async function init() {
    await refreshAll();
  }

  function notifyChange() {
    window.dispatchEvent(new CustomEvent("amarel:data-changed"));
  }

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeLocal(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  }

  async function refreshAll() {
    data.insights = readLocal(LOCAL_KEY);
    data.trash = readLocal(TRASH_KEY);

    if (!supabase) {
      console.warn("Supabase client not loaded, using localStorage.");
      return;
    }

    try {
      const [ins, deps, jobs, roles] = await Promise.all([
        supabase.from("insights").select("*").order("created_at", { ascending: false }),
        supabase.from("departments").select("name"),
        supabase.from("jobs").select("name"),
        supabase.from("roles").select("name")
      ]);

      if (ins.data && ins.data.length > 0) {
        // Filter out items that are currently in local trash
        const trashIds = new Set(data.trash.map(t => String(t.id)));
        data.insights = ins.data.map(mapFromDb).filter(item => !trashIds.has(String(item.id)));
        writeLocal(LOCAL_KEY, data.insights);
      }
      if (deps.data && deps.data.length > 0) {
        data.departments = deps.data.map(d => d.name);
      }
      if (jobs.data && jobs.data.length > 0) {
        data.jobs = jobs.data.map(j => j.name);
      }
      if (roles.data && roles.data.length > 0) {
        data.roles = roles.data.map(r => r.name);
      }
    } catch (err) {
      console.warn("Could not sync with Supabase, relying on localStorage:", err);
    }
  }

  function mapFromDb(row) {
    return {
      id: String(row.id),
      managerName: row.manager_name || "",
      managerRole: row.manager_role || "",
      department: row.department || "",
      jobTitle: row.job_title || "",
      intervieweeName: row.interviewee_name || "",
      insights: row.insights || "",
      situations: row.situations || "",
      cases: row.cases || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString()
    };
  }

  function mapToDb(item) {
    return {
      manager_name: (item.managerName || "").trim(),
      manager_role: (item.managerRole || "").trim(),
      department: (item.department || "").trim(),
      job_title: (item.jobTitle || "").trim(),
      interviewee_name: (item.intervieweeName || "").trim(),
      insights: (item.insights || "").trim(),
      situations: (item.situations || "").trim(),
      cases: (item.cases || "").trim()
    };
  }

  function uid() {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getDepartments() {
    const set = new Set([...data.departments, ...DEFAULT_DEPARTMENTS, ...data.insights.map(i => i.department).filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }

  async function addDepartment(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    if (!data.departments.includes(clean)) data.departments.push(clean);
    if (supabase) {
      try { await supabase.from("departments").upsert({ name: clean }); } catch (e) {}
    }
  }

  function getJobs() {
    const set = new Set([...data.jobs, ...data.insights.map(i => i.jobTitle).filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }

  async function addJob(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    if (!data.jobs.includes(clean)) data.jobs.push(clean);
    if (supabase) {
      try { await supabase.from("jobs").upsert({ name: clean }); } catch (e) {}
    }
  }

  function getRoles() {
    const set = new Set([...data.roles, ...data.insights.map(i => i.managerRole).filter(Boolean)]);
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }

  async function addRole(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    if (!data.roles.includes(clean)) data.roles.push(clean);
    if (supabase) {
      try { await supabase.from("roles").upsert({ name: clean }); } catch (e) {}
    }
  }

  function getInsights() {
    return data.insights;
  }

  function getTrashItems() {
    return data.trash;
  }

  function getInsightById(id) {
    return data.insights.find(i => String(i.id) === String(id)) || null;
  }

  async function saveInsight(payload) {
    const dbItem = mapToDb(payload);
    let savedItem = null;

    const localItem = {
      id: payload.id || uid(),
      managerName: dbItem.manager_name,
      managerRole: dbItem.manager_role,
      department: dbItem.department,
      jobTitle: dbItem.job_title,
      intervieweeName: dbItem.interviewee_name,
      insights: dbItem.insights,
      situations: dbItem.situations,
      cases: dbItem.cases,
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        let result;
        if (payload.id && String(payload.id).length > 20) {
          result = await supabase.from("insights").update(dbItem).eq("id", payload.id).select();
        } else {
          result = await supabase.from("insights").insert([dbItem]).select();
        }

        if (result.data && result.data[0]) {
          savedItem = mapFromDb(result.data[0]);
        }
      } catch (err) {
        console.warn("Supabase save exception, saving locally:", err);
      }
    }

    if (!savedItem) {
      savedItem = localItem;
    }

    const idx = data.insights.findIndex(x => String(x.id) === String(savedItem.id));
    if (idx >= 0) {
      data.insights[idx] = savedItem;
    } else {
      data.insights.unshift(savedItem);
    }
    writeLocal(LOCAL_KEY, data.insights);

    await Promise.all([
      addDepartment(savedItem.department),
      addJob(savedItem.jobTitle),
      addRole(savedItem.managerRole)
    ]);

    notifyChange();
    return savedItem;
  }

  // Soft Delete: Move to Trash
  async function moveToTrash(id) {
    const item = getInsightById(id);
    if (!item) return;

    data.insights = data.insights.filter(x => String(x.id) !== String(id));
    writeLocal(LOCAL_KEY, data.insights);

    const trashedItem = {
      ...item,
      deletedAt: new Date().toISOString()
    };

    data.trash.unshift(trashedItem);
    writeLocal(TRASH_KEY, data.trash);

    // Also delete immediately from Supabase so refreshAll won't bring it back
    if (supabase) {
      try {
        await supabase.from("insights").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete on moveToTrash error:", err);
      }
    }

    notifyChange();
    return trashedItem;
  }

  // Restore item from Trash back to active Insights & Supabase
  async function restoreFromTrash(id) {
    const trashedIdx = data.trash.findIndex(x => String(x.id) === String(id));
    if (trashedIdx < 0) return;

    const item = data.trash[trashedIdx];
    data.trash.splice(trashedIdx, 1);
    writeLocal(TRASH_KEY, data.trash);

    delete item.deletedAt;
    await saveInsight(item);
  }

  // Permanent Delete from Supabase & Local Storage
  async function permanentlyDelete(id) {
    data.trash = data.trash.filter(x => String(x.id) !== String(id));
    writeLocal(TRASH_KEY, data.trash);

    data.insights = data.insights.filter(x => String(x.id) !== String(id));
    writeLocal(LOCAL_KEY, data.insights);

    if (supabase) {
      try {
        await supabase.from("insights").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }

    notifyChange();
  }

  // Empty entire Trash bin
  async function emptyTrash() {
    const ids = data.trash.map(t => t.id);
    data.trash = [];
    writeLocal(TRASH_KEY, data.trash);

    if (supabase && ids.length > 0) {
      try {
        await supabase.from("insights").delete().in("id", ids);
      } catch (err) {
        console.warn("Supabase empty trash error:", err);
      }
    }

    notifyChange();
  }

  function searchInsights(query = {}, filters = {}) {
    const q = String(query.q || "").trim().toLowerCase();
    return data.insights.filter(item => {
      if (filters.department && item.department !== filters.department) return false;
      if (filters.jobTitle && item.jobTitle !== filters.jobTitle) return false;
      if (filters.managerRole && item.managerRole !== filters.managerRole) return false;
      if (!q) return true;
      const hay = [
        item.managerName,
        item.managerRole,
        item.department,
        item.jobTitle,
        item.intervieweeName,
        item.insights,
        item.situations,
        item.cases
      ].join(" ").toLowerCase();
      return q.split(/\s+/).every(token => hay.includes(token));
    });
  }

  function stats() {
    return {
      total: data.insights.length,
      trashTotal: data.trash.length,
      departments: getDepartments().length,
      jobs: getJobs().length
    };
  }

  init();

  return {
    getDepartments,
    addDepartment,
    getJobs,
    addJob,
    getRoles,
    addRole,
    getInsights,
    getTrashItems,
    getInsightById,
    saveInsight,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    searchInsights,
    stats,
    refreshAll
  };
})();