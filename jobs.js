// Vercel serverless function: GET /api/jobs
// Fetches contract roles (C2C, C2H, W2) from the JSearch aggregator API.
// Results are cached at Vercel's edge, so the API is called at most once per CACHE_SECONDS.
const BASE = "https://api.openwebninja.com/jsearch";
const CACHE_SECONDS = 43200; // 12 hours. Free plans have a small monthly quota (about 180 calls/month at this setting). Lower it only after upgrading.
const QUERIES = ["C2C contract", "C2H contract to hire", "W2 contract"];

const typeOf = (t) => {
  t = t.toLowerCase();
  if (/\bc2c\b|corp[\s-]*to[\s-]*corp/.test(t)) return "C2C";
  if (/\bc2h\b|contract[\s-]*to[\s-]*(hire|perm)/.test(t)) return "C2H";
  if (/\bw-?2\b/.test(t)) return "W2";
  return null;
};
const categoryOf = (t) => {
  t = t.toLowerCase();
  if (/design|ux|ui\b/.test(t)) return "Design";
  if (/market|seo|content/.test(t)) return "Marketing";
  if (/sales|account exec|business development/.test(t)) return "Sales";
  if (/engineer|develop|data|devops|software|qa|cloud|java|python|\.net|sap/.test(t)) return "Engineering";
  return "Operations";
};
const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso)) / 864e5);
  return isNaN(d) ? "Recently" : d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
};
const pay = (j) => {
  if (!j.job_min_salary && !j.job_max_salary) return "";
  const per = { HOUR: "hr", YEAR: "yr", MONTH: "mo" }[j.job_salary_period] || "";
  const f = (n) => "$" + Math.round(n).toLocaleString("en-US");
  return [j.job_min_salary && f(j.job_min_salary), j.job_max_salary && f(j.job_max_salary)].filter(Boolean).join(" – ") + (per ? ` / ${per}` : "");
};

module.exports = async (req, res) => {
  const key = process.env.JSEARCH_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing JSEARCH_API_KEY" });
  try {
    const results = await Promise.all(QUERIES.map(async (q) => {
      const url = `${BASE}/search?query=${encodeURIComponent(q + " in United States")}&page=1&num_pages=1&date_posted=week`;
      const r = await fetch(url, { headers: { "x-api-key": key } });
      if (!r.ok) throw new Error(`Source returned ${r.status}`);
      return (await r.json()).data || [];
    }));
    const seen = new Set();
    const jobs = [];
    for (const j of results.flat()) {
      if (seen.has(j.job_id)) continue;
      seen.add(j.job_id);
      const text = `${j.job_title} ${j.job_description || ""}`;
      const type = typeOf(text);
      if (!type) continue; // keep only C2C / C2H / W2 roles
      jobs.push({
        id: j.job_id,
        title: j.job_title,
        company: j.employer_name || "Confidential",
        location: j.job_is_remote ? "Remote" : [j.job_city, j.job_state].filter(Boolean).join(", ") || j.job_country || "US",
        type,
        category: categoryOf(j.job_title),
        salary: pay(j),
        desc: (j.job_description || "").replace(/\s+/g, " ").slice(0, 700),
        reqs: ((j.job_highlights || {}).Qualifications || []).slice(0, 5),
        posted: ago(j.job_posted_at_datetime_utc),
        url: j.job_apply_link,
        source: j.job_publisher,
      });
    }
    res.setHeader("Cache-Control", `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`);
    res.status(200).json({ updated: new Date().toISOString(), jobs });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
