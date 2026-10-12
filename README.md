# WaferTrack

Dashboard for **wafer movements across locations** and **die-level test results**, fed by datasets landed through **Azure Data Factory (ADF)**.

## What it shows

- Wafers currently at each fab / test / assembly station
- Per-wafer movement timeline (MES events ingested by ADF)
- Die bin maps and yield for CP1 / CP2 / FT stages
- Filters by lot, location, product, and free-text search

## Data source (ADF)

ADF copies MES and tester feeds into Synapse, Fabric, or ADLS. A thin API should expose:

`GET /wafer-track/bundle`

returning the shape in `src/data/types.ts` (`AdfDatasetBundle`: wafers, movements, dieResults, locations).

| Env | Behavior |
| --- | --- |
| `VITE_ADF_API_BASE` unset | Uses local ADF-shaped mock (`src/data/mockAdf.ts`) |
| `VITE_ADF_API_BASE=https://…` | Loads from `{base}/wafer-track/bundle` |

See `.env.example`.

### Suggested ADF sink tables

1. `dim_location` — station codes and sites  
2. `fact_wafer_movement` — wafer_id, from/to location, equipment, timestamps  
3. `fact_die_test_result` — wafer_id, die_x/y, stage, bin, parameters  

Map those into the API bundle the dashboard already consumes.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```
