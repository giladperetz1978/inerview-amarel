/**
 * Supabase Storage implementation for Amarel Interview Insights.
 */
const Storage = (() => {
  const SUPABASE_URL = "https://esdksihfrirldclboltc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_msrylgqAhtCy0vlbCYXMYQ_vGiyIKVm";
  
  const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  const DEFAULT_DEPARTMENTS = ["אינטגרציה", "ניסויים"];

  let data = {
    insights: [],
    departments: [],
    jobs: [],
    roles: []
  };

  async function init() {
    if (!supabase) {
      console.warn("Supabase not loaded");
      return;
    }
    await refreshAll();
  }

  async function refreshAll() {
    try {
      const [ins, deps, jobs, roles] = await Promise.all([
        supabase.from("insights").select("*").order("created_at", { ascending: false }),
        supabase.from("departments").select("name"),
        supabase.from("jobs").select("name"),
        supabase.from("roles").select("name")
      ]);

      if (ins.data) data.insights = ins.data.map(mapFromDb);
      if (deps.data) data.departments = deps.data.map(d => d.name);
      if (jobs.data) data.jobs = jobs.data.map(j => j.name);
      if (roles.data) data.roles = roles.data.map(r => r.name);
    } catch (err) {
      console.error("Failed to fetch from Supabase:", err);
    }
  }

  function mapFromDb(row) {
    return {
      id: row.id,
      managerName: row.manager_name,
      managerRole: row.manager_role,
      department: row.department,
      jobTitle: row.job_title,
      intervieweeName: row.interviewee_name,
      insights: row.insights,
      situations: row.situations,
      cases: row.cases,
      createdAt: row.created_at,
      updated_at: row.updated_at
    };
  }

  function mapToDb(item) {
    return {
      manager_name: item.managerName,
      manager_role: item.managerRole,
      department: item.department,
      job_title: item.jobTitle,
      interviewee_name: item.intervieweeName,
      insights: item.insights,
      situations: item.situations,
      cases: item.cases
    };
  }

  function getDepartments() {
    return [...new Set([...data.departments, ...DEFAULT_DEPARTMENTS])].sort((a, b) => a.localeCompare(b, "he"));
  }

  async function addDepartment(name) {
    const clean = String(name || "").trim();
    if (!clean || data.departments.includes(clean)) return;
    await supabase.from("departments").upsert({ name: clean });
    await refreshAll();
  }

  function getJobs() { return data.jobs.sort((a, b) => a.localeCompare(b, "he")); }

  async function addJob(name) {
    const clean = String(name || "").trim();
    if (!clean || data.jobs.includes(clean)) return;
    await supabase.from("jobs").upsert({ name: clean });
    await refreshAll();
  }

  function getRoles() { return data.roles.sort((a, b) => a.localeCompare(b, "he")); }

  async function addRole(name) {
    const clean = String(name || "").trim();
    if (!clean || data.roles.includes(clean)) return;
    await supabase.from("roles").upsert({ name: clean });
    await refreshAll();
  }

  function getInsights() { return data.insights; }

  function getInsightById(id) { return data.insights.find(i => i.id === id) || null; }

  async function saveInsight(payload) {
    const dbItem = mapToDb(payload);
    let result;
    if (payload.id && payload.id.length > 20) {
      result = await supabase.from("insights").update(dbItem).eq("id", payload.id).select();
    } else {
      result = await supabase.from("insights").insert([dbItem]).select();
    }
    if (result.error) throw result.error;
    await Promise.all([addDepartment(payload.department), addJob(payload.jobTitle), addRole(payload.managerRole)]);
    await refreshAll();
    return mapFromDb(result.data[0]);
  }

  async function deleteInsight(id) {
    await supabase.from("insights").delete().eq("id", id);
    await refreshAll();
  }

  function searchInsights(query = {}, filters = {}) {
    const q = String(query.q || "").trim().toLowerCase();
    return data.insights.filter(item => {
      if (filters.department && item.department !== filters.department) return false;
      if (filters.jobTitle && item.jobTitle !== filters.jobTitle) return false;
      if (filters.managerRole && item.managerRole !== filters.managerRole) return false;
      if (!q) return true;
      const hay = [item.managerName, item.managerRole, item.department, item.jobTitle, item.intervieweeName, item.insights, item.situations, item.cases].join(" ").toLowerCase();
      return q.split(/\s+/).every(token => hay.includes(token));
    });
  }

  function stats() { return { total: data.insights.length, departments: getDepartments().length, jobs: data.jobs.length }; }

  init();

  return { getDepartments, addDepartment, getJobs, addJob, getRoles, addRole, getInsights, getInsightById, saveInsight, deleteInsight, searchInsights, stats };
})();
