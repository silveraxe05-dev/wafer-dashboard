# WaferTrack

Dashboard for **wafer movements** and **die test results** (CP1, CP2, Class Test, Final Test), fed by ADF-landed Synapse-shaped tables.

## Stack

| Layer | What |
| --- | --- |
| ADF sink (local stand-in) | SQLite tables matching `fabops.dim_*` / `fact_*` |
| API | `GET /wafer-track/bundle` on port `8787` |
| UI | Vite React dashboard (`VITE_ADF_API_BASE`) |

### Tables

- `dim_location`
- `dim_wafer`
- `fact_wafer_movement`
- `fact_die_test_result` — `test_stage` ∈ `CP1` \| `CP2` \| `CLASS` \| `FT`
- `adf_pipeline_meta`

Swap the SQLite file for Azure Synapse by pointing the API connection at Synapse; keep the same table/column names.

## Run

```bash
npm install
npm run api:seed   # force reseed fabops tables
npm run dev        # API + UI together
```

- UI: http://localhost:5173  
- API: http://localhost:8787/wafer-track/bundle  
- Health: http://localhost:8787/health  

Optional filters: `?lotId=LOT-A2401&asOf=2026-10-12T00:00:00Z`

## Production

Set `VITE_ADF_API_BASE` to your hosted API (same path `/wafer-track/bundle`). Replace SQLite in `api/db.ts` with a Synapse/`mssql` client when credentials are available.
