# Udvenco – setup (about 15 minutes, all free tiers)

Udvenco shows live contract jobs (C2C, C2H, W2). Jobs come from the JSearch aggregator API
(Google for Jobs + public boards), are filtered to contract types, cached, and refreshed on the page every 5 minutes.
Until the key is added, the page shows sample jobs.

## Step 1 – Get an API key
1. Go to https://app.openwebninja.com/api/jsearch and create a free account.
2. Subscribe to the free plan and copy your API key.
   (If the endpoint in `api/jobs.js` ever differs from their docs, update `BASE` / the `/search` path.)

## Step 2 – Put the project on GitHub
1. Create a free account at https://github.com and click New repository (name it `udvenco`).
2. Click "uploading an existing file" and drag in everything from this folder (`api`, `public`, `package.json`, `README.md`). Commit.

## Step 3 – Deploy on Vercel
1. Go to https://vercel.com, sign up with GitHub, click Add New > Project, and import `udvenco`.
2. Before deploying, open Environment Variables and add:
   Name: `JSEARCH_API_KEY`   Value: (your key)
3. Click Deploy. Your site is live at a `.vercel.app` address. Add your own domain under Settings > Domains.

## Tuning
- Freshness vs. quota: `CACHE_SECONDS` in `api/jobs.js` is 43200 (12 hours) so the free plan lasts the month. Each refresh uses 3 API calls. After upgrading, lower it (e.g. 1800 = every 30 min).
- More searches: edit `QUERIES` (e.g. add "C2C Java developer").
- Jobs posted through the "Post a job" form only exist in that visitor's browser until you add a database.

## Notes
- Check JSearch's terms and plan limits for commercial use.
- Apply buttons open the original posting in a new tab.
