# ADF → WaferTrack dashboard flow

```text
  MES movements          Tester / STDF bins
  (locations)            (CP1/CP2/CLASS/FT)
         \                    /
          \                  /
           v                v
          +------------------+
          | Azure Data       |
          | Factory (ADF)    |
          | Copy / Data Flow |
          +--------+---------+
                   |
                   v
          +------------------+
          | Synapse tables   |
          | dim_location     |
          | dim_wafer        |
          | fact_wafer_      |
          |   movement       |
          | fact_die_test_   |
          |   result         |
          +--------+---------+
                   |
                   v
          +------------------+
          | WaferTrack API   |
          | GET /wafer-      |
          |   track/bundle   |
          +--------+---------+
                   |
                   v
          +------------------+
          | Dashboard UI     |
          | locations,       |
          | movements,       |
          | CLASS / FT maps  |
          +------------------+
```

## Steps

1. **Sources** — MES (wafer location moves) + tester systems (CP1 / CP2 / CLASS / FT bins).
2. **ADF** — scheduled pipeline copies/transforms into Synapse.
3. **Sink tables** — `fabops.dim_*` / `fact_*` (see `api/schema.sql`).
4. **API** — reads those tables, returns one JSON bundle.
5. **UI** — location board, wafer list (GDR/RNR/WHR/FP8), movement timeline, die maps.

## Table → UI mapping

| Table | Dashboard use |
| --- | --- |
| `dim_location` | Location board + filters |
| `dim_wafer` | Wafer queue, product, yield |
| `fact_wafer_movement` | Movement timeline |
| `fact_die_test_result` | Die map + bins (CP1/CP2/CLASS/FT) |

## Today vs production

| Mode | Data source |
| --- | --- |
| Local demo | SQLite seed (`npm run api:seed`) |
| Production | Synapse tables filled by ADF |

UI does not change — only the API database connection does.
