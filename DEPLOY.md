# WaferTrack — step-by-step deploy

Deploy two parts (or one combined host):

| Piece | Role |
| --- | --- |
| **API** | `GET /wafer-track/bundle` — reads ADF-landed tables |
| **UI** | Vite React app — calls the API via `VITE_ADF_API_BASE` |

Choose **Option A** (Azure, recommended for ADF/Synapse), **Option B** (one Azure App Service), or **Option C** (Docker).

---

## Before you start

1. Install Node.js 22+ and npm.
2. Have the project at `wafer-dashboard/`.
3. Confirm it runs locally:

```bash
cd wafer-dashboard
npm install
npm run api:seed
npm run dev
```

- UI: http://localhost:5173  
- API health: http://localhost:8787/health  
- Bundle: http://localhost:8787/wafer-track/bundle  

4. Decide your public API URL, for example:  
   `https://wafertrack-api.azurewebsites.net`

---

## Option A — Azure API + Azure Static Web Apps (recommended)

### Step 1 — Prepare the API for Azure

1. Open Azure Portal → create a **Resource Group** (e.g. `rg-wafertrack`).
2. Create an **App Service**:
   - Runtime: **Node 22 LTS**
   - OS: Linux
   - Name: e.g. `wafertrack-api`
3. Note the default URL: `https://wafertrack-api.azurewebsites.net`

### Step 2 — Configure App Service settings

In App Service → **Configuration** → **Application settings**, add:

| Name | Value |
| --- | --- |
| `ADF_API_PORT` | `8080` |
| `PORT` | `8080` |
| `SERVE_UI` | `0` |
| `CORS_ORIGIN` | `https://<your-static-web-app-host>` (set after Step 5; use `*` temporarily) |
| `ADF_SQLITE_PATH` | `/home/data/fabops.sqlite` (demo only; later use Synapse) |

Save and restart when prompted.

> Production later: replace SQLite with Synapse connection settings and update `api/db.ts` / `api/queries.ts` to use `mssql`. Keep the same table names.

### Step 3 — Deploy the API code

From your machine (Azure CLI logged in):

```bash
cd wafer-dashboard
npm install
npm run api:seed

# Zip the app (exclude node_modules if you prefer remote install)
zip -r /tmp/wafertrack-api.zip . \
  -x "node_modules/*" -x "dist/*" -x ".git/*"

az webapp deploy \
  --resource-group rg-wafertrack \
  --name wafertrack-api \
  --src-path /tmp/wafertrack-api.zip \
  --type zip
```

Set the App Service **Startup Command**:

```bash
npm install && npx tsx api/server.ts
```

(Or run `npm ci --omit=dev` in a build pipeline and start with `npx tsx api/server.ts`.)

### Step 4 — Verify the API

```bash
curl https://wafertrack-api.azurewebsites.net/health
curl https://wafertrack-api.azurewebsites.net/wafer-track/bundle | head
```

You should see `"ok": true` and a JSON bundle with wafers / movements / dieResults.

### Step 5 — Create the Static Web App (UI)

1. Azure Portal → **Static Web App** → Create.
2. Link your GitHub/Azure DevOps repo **or** deploy from local build.
3. Build locally with the API URL:

```bash
cd wafer-dashboard
export VITE_ADF_API_BASE=https://wafertrack-api.azurewebsites.net
npm run build
```

4. Deploy the `dist/` folder (SWA CLI example):

```bash
npm install -g @azure/static-web-apps-cli
swa deploy ./dist \
  --env production \
  --deployment-token <YOUR_SWA_DEPLOYMENT_TOKEN>
```

5. Copy the Static Web App URL (e.g. `https://nice-name.azurestaticapps.net`).

### Step 6 — Lock CORS

Back in App Service settings, set:

```text
CORS_ORIGIN=https://nice-name.azurestaticapps.net
```

Restart the API App Service.

### Step 7 — Smoke-test the full app

1. Open the Static Web App URL.
2. Confirm the top chip shows **ADF API** and a pipeline run id.
3. Open a wafer → check **CLASS** / **FT** tabs and movement history.
4. Browser DevTools → Network → `wafer-track/bundle` should return **200** from your App Service host.

---

## Option B — Single Azure App Service (API + UI together)

Best when you want one URL for everything.

### Step 1 — Build UI against the same host

For same-origin API calls, build with an empty/relative base:

```bash
cd wafer-dashboard
# Same host: browser calls /wafer-track/bundle on this App Service
export VITE_ADF_API_BASE=
npm run build
```

If you prefer an absolute URL:

```bash
export VITE_ADF_API_BASE=https://wafertrack.azurewebsites.net
npm run build
```

### Step 2 — Create App Service

- Name: e.g. `wafertrack`
- Node 22 Linux
- Startup command:

```bash
npm install && npx tsx api/server.ts
```

App settings:

| Name | Value |
| --- | --- |
| `PORT` | `8080` |
| `ADF_API_PORT` | `8080` |
| `SERVE_UI` | `1` (default if `dist/` exists) |
| `ADF_SQLITE_PATH` | `/home/data/fabops.sqlite` |

### Step 3 — Deploy zip including `dist/`

```bash
cd wafer-dashboard
npm install
npm run api:seed
VITE_ADF_API_BASE= https://wafertrack.azurewebsites.net npm run build
# or VITE_ADF_API_BASE= for relative fetch if you change the client later

zip -r /tmp/wafertrack.zip . -x "node_modules/*" -x ".git/*"

az webapp deploy \
  --resource-group rg-wafertrack \
  --name wafertrack \
  --src-path /tmp/wafertrack.zip \
  --type zip
```

The API automatically serves `dist/` when that folder exists (`SERVE_UI` not set to `0`).

### Step 4 — Verify

```bash
curl https://wafertrack.azurewebsites.net/health
curl https://wafertrack.azurewebsites.net/wafer-track/bundle | head
```

Open `https://wafertrack.azurewebsites.net` in a browser.

---

## Option C — Docker (any host / AKS / Container Apps)

### Step 1 — Build image

From `wafer-dashboard/`:

```bash
docker build -t wafertrack:latest .
```

(Uses the included `Dockerfile`.)

### Step 2 — Run container

```bash
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e ADF_API_PORT=8080 \
  -e SERVE_UI=1 \
  wafertrack:latest
```

### Step 3 — Verify

- http://localhost:8080/health  
- http://localhost:8080/  
- http://localhost:8080/wafer-track/bundle  

### Step 4 — Push to a registry (optional)

```bash
az acr login --name <yourAcr>
docker tag wafertrack:latest <yourAcr>.azurecr.io/wafertrack:latest
docker push <yourAcr>.azurecr.io/wafertrack:latest
```

Then create an Azure Container App / Web App for Containers pointing at that image, with port **8080**.

---

## Point at real Synapse (after first deploy)

1. Confirm ADF has landed into:
   - `dim_location`
   - `dim_wafer`
   - `fact_wafer_movement`
   - `fact_die_test_result`
2. Store the Synapse SQL connection string in **Key Vault** / App Settings (never commit it).
3. Update `api/db.ts` + `api/queries.ts` to query Synapse (`mssql`) instead of SQLite.
4. Redeploy the API only; UI stays the same as long as `/wafer-track/bundle` shape is unchanged.
5. Re-run health + bundle checks.

---

## Environment variable cheat sheet

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_ADF_API_BASE` | UI **build** time | Public API origin (no trailing slash) |
| `ADF_API_PORT` / `PORT` | API runtime | Listen port (`8080` on Azure) |
| `SERVE_UI` | API runtime | `1` serve `dist/`; `0` API-only |
| `CORS_ORIGIN` | API runtime | Allowed UI origin(s), comma-separated |
| `ADF_SQLITE_PATH` | API runtime | Demo SQLite path |

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| UI loads but empty / mock data | Rebuild UI with correct `VITE_ADF_API_BASE`; hard-refresh |
| Browser CORS error | Set `CORS_ORIGIN` to the exact UI HTTPS origin; restart API |
| `/health` 404 / app won’t start | Check startup command and Node 22; check Log stream |
| Bundle empty | Run `npm run api:seed` (demo) or verify Synapse tables have rows |
| Port bind errors on Azure | Use `PORT=8080` (App Service injects this) |

---

## Done checklist

- [ ] `/health` returns `"ok": true`
- [ ] `/wafer-track/bundle` returns wafers
- [ ] UI opens on HTTPS
- [ ] ADF chip shows a pipeline run id
- [ ] Class Test / Final Test tabs work on a late-flow wafer
- [ ] CORS locked to your UI origin (split deploy)
- [ ] Secrets not committed to git
