# Azure Data Factory setup (step by step)

This guide creates an ADF pipeline that lands wafer data into the tables WaferTrack expects:

- `fabops.dim_location`
- `fabops.dim_wafer`
- `fabops.fact_wafer_movement`
- `fabops.fact_die_test_result`

---

## Before you start

You need:

1. An **Azure subscription** and permission to create resources  
2. A **Synapse workspace** or **Azure SQL Database** (sink)  
3. Source access for:
   - MES / location movement extracts (files or DB)
   - Tester / STDF / bin summary extracts (files or DB)
4. The sink tables already created (see table DDL in chat / `api/schema.sql` adapted for T-SQL)

If tables are not created yet, create them in Synapse/SQL first, then continue.

---

## Step 1 — Create the Data Factory

1. Open [Azure Portal](https://portal.azure.com)  
2. Search **Data factories** → **Create**  
3. Fill in:
   - **Subscription**: your subscription  
   - **Resource group**: e.g. `rg-wafertrack` (create new if needed)  
   - **Name**: e.g. `adf-wafertrack`  
   - **Region**: same region as Synapse/SQL if possible  
4. **Review + create** → **Create**  
5. When done, open the resource → **Launch studio** (ADF Studio)

---

## Step 2 — Create a sink linked service (Synapse / Azure SQL)

In ADF Studio:

1. Left menu → **Manage** (toolbox icon) → **Linked services** → **New**  
2. Choose:
   - **Azure Synapse Analytics**, or  
   - **Azure SQL Database**  
3. Name it: `ls_fabops_sink`  
4. Connect via:
   - **Connection string** from Azure Portal, or  
   - **Azure Key Vault** (recommended for production)  
5. **Test connection** → should succeed  
6. **Create**

---

## Step 3 — Create source linked services

Repeat for each source system you have.

### Example A — files in ADLS / Blob
1. **New linked service** → **Azure Data Lake Storage Gen2** or **Azure Blob Storage**  
2. Name: `ls_mes_landing` / `ls_tester_landing`  
3. Point to the container/folder where MES and tester files land  
4. Test connection → Create  

### Example B — source SQL / Oracle / etc.
1. **New linked service** → your source type  
2. Name: `ls_mes_db` / `ls_tester_db`  
3. Enter host, database, credentials (prefer Key Vault)  
4. Test connection → Create  

> If you do not have real MES/tester feeds yet, use sample CSV/Parquet files in a Blob container as a starter source.

---

## Step 4 — Create datasets

### Sink datasets (4)

**Manage/Author → Datasets → New** for each:

| Dataset name | Linked service | Table |
| --- | --- | --- |
| `ds_dim_location` | `ls_fabops_sink` | `fabops.dim_location` |
| `ds_dim_wafer` | `ls_fabops_sink` | `fabops.dim_wafer` |
| `ds_fact_wafer_movement` | `ls_fabops_sink` | `fabops.fact_wafer_movement` |
| `ds_fact_die_test_result` | `ls_fabops_sink` | `fabops.fact_die_test_result` |

For each:
1. Select the linked service  
2. Pick schema `fabops` + table name  
3. Import schema  
4. Publish

### Source datasets

Create one per feed, for example:

| Dataset name | Type | Notes |
| --- | --- | --- |
| `ds_src_mes_moves` | DelimitedText / Parquet / SQL | wafer moves |
| `ds_src_die_bins` | DelimitedText / Parquet / SQL | die test bins |

Example CSV columns (recommended if starting from files):

**MES moves (`ds_src_mes_moves`)**
```text
movement_id,wafer_id,lot_id,product,technology,from_location,to_location,equipment_id,operator,status,moved_at,notes
```

**Die bins (`ds_src_die_bins`)**
```text
wafer_id,die_x,die_y,test_stage,bin_code,hard_bin,soft_bin,tested_at,site,idd_ma,voh_v,delay_ns
```

`test_stage` values should be: `CP1`, `CP2`, `CLASS`, `FT`  
`product` should include: `GDR`, `RNR`, `WHR`, `FP8` (and others as needed)

---

## Step 5 — Seed `dim_location` (one-time)

Either:

**Option A — SQL script** (run once in Synapse/SQL Query editor), or  
**Option B — small ADF copy** from a static locations CSV into `ds_dim_location`.

Minimum rows:

```text
location_code,location_name,site,sequence_no
FAB_IN,Fab Incoming,Penang,1
INCOMING_QA,Incoming QA,Penang,2
CP1_PROBE,CP1 Probe,Penang,3
BAKE,Bake,Penang,4
CP2_PROBE,CP2 Probe,Penang,5
INK,Ink / Mark,Penang,6
SORT,Die Sort,Penang,7
CLASS_TEST,Class Test,Kulim,8
ASSEMBLY,Assembly,Kulim,9
FINAL_TEST,Final Test,Kulim,10
SHIP,Ship Ready,Kulim,11
HOLD,Quality Hold,Shared,99
```

---

## Step 6 — Build the pipeline

1. **Author** → **Pipelines** → **New pipeline**  
2. Name: `pl_wafer_track_ingest`  
3. Add activities (drag from Activities pane):

### Activity 1 — Copy MES moves → movement fact
- Type: **Copy data**  
- Name: `copy_fact_wafer_movement`  
- Source: `ds_src_mes_moves`  
- Sink: `ds_fact_wafer_movement`  
- Mapping: map columns 1:1 (`movement_id`, `wafer_id`, `from_location`, `to_location`, …)  
- Sink settings: prefer **upsert** on `movement_id` if available; otherwise pre-delete window / append with dedupe logic  

### Activity 2 — Build / upsert `dim_wafer`
You can do this in either way:

**Simple path (recommended first)**  
- If source already has a wafer master file/table → Copy into `ds_dim_wafer`  

**Derived path**  
- Use a **Data flow** to aggregate latest move per `wafer_id` and write:
  - `current_location` = latest `to_location`  
  - `last_moved_at` = latest `moved_at`  
  - `product` / `lot_id` from source attributes  
  - `yield_pct` / `tested_die_count` from die results (join later)

### Activity 3 — Copy die results
- Type: **Copy data**  
- Name: `copy_fact_die_test_result`  
- Source: `ds_src_die_bins`  
- Sink: `ds_fact_die_test_result`  
- Mapping: `wafer_id`, `die_x`, `die_y`, `test_stage`, `bin_code`, `hard_bin`, `soft_bin`, `tested_at`, `site`, params  

### Activity order
```text
copy_fact_wafer_movement
        ↓
 upsert / copy dim_wafer
        ↓
copy_fact_die_test_result
```

(Or run moves + dies in parallel after locations exist.)

4. **Validate** the pipeline  
5. **Publish all**

---

## Step 7 — Debug run (test)

1. Open pipeline → **Debug**  
2. Wait for all activities to succeed (green)  
3. In Synapse/SQL, verify:

```sql
SELECT COUNT(*) AS wafers FROM fabops.dim_wafer;
SELECT COUNT(*) AS moves FROM fabops.fact_wafer_movement;
SELECT COUNT(*) AS dies FROM fabops.fact_die_test_result;

SELECT product, COUNT(*) AS n
FROM fabops.dim_wafer
GROUP BY product
ORDER BY product;

SELECT test_stage, COUNT(*) AS n
FROM fabops.fact_die_test_result
GROUP BY test_stage
ORDER BY test_stage;
```

You should see products like GDR/RNR/WHR/FP8 and stages CP1/CP2/CLASS/FT when those feeds are present.

---

## Step 8 — Schedule the pipeline

1. Pipeline canvas → **Add trigger** → **New/Edit**  
2. Type: **Schedule**  
3. Example: every **15 minutes** or hourly  
4. Start date/time in your local fab timezone  
5. **OK** → **Publish**

---

## Step 9 — Connect WaferTrack API to Synapse

After ADF is writing real rows:

1. Give the API a read-only SQL user / connection string  
2. Replace SQLite in `api/db.ts` + `api/queries.ts` with Synapse/`mssql`  
3. Set env:
   ```bat
   set SYNAPSE_CONNECTION_STRING=Server=tcp:...;Database=...;User ID=...;Password=...;
   ```
4. Restart API and check:
   ```bat
   curl http://localhost:8787/wafer-track/bundle
   ```
5. Open the dashboard — data should match Synapse, not seed lots

---

## Minimal starter (no real MES yet)

If sources are not ready:

1. Upload sample CSVs to Blob/ADLS  
2. Point source datasets at those files  
3. Run `pl_wafer_track_ingest` once  
4. Confirm tables fill  
5. Swap CSV sources for real MES/tester linked services later **without changing sink tables**

Sample file names:
- `mes_moves_YYYYMMDD.csv`
- `die_bins_YYYYMMDD.csv`
- `locations.csv` (once)

---

## Common issues

| Problem | Fix |
| --- | --- |
| Test connection fails | Firewall / private endpoint / credentials / Key Vault reference |
| Copy fails on type mismatch | Align datetime (`DATETIME2`) and int/decimal types; set format in dataset |
| Duplicate keys | Enable upsert or delete-by-watermark before insert |
| No CLASS/FT in UI | Ensure `test_stage` values are exactly `CLASS` / `FT` |
| No GDR/RNR/WHR/FP8 | Ensure `dim_wafer.product` uses those exact codes |
| Dashboard still shows seed data | API still on SQLite — switch connection + restart, don’t run `api:seed` in prod |

---

## Done checklist

- [ ] ADF created (`adf-wafertrack`)  
- [ ] Sink linked service works  
- [ ] Source linked service(s) work  
- [ ] 4 sink datasets created  
- [ ] `dim_location` populated  
- [ ] Pipeline debug run succeeded  
- [ ] Synapse row counts > 0  
- [ ] Trigger scheduled  
- [ ] API pointed at Synapse  
- [ ] Dashboard shows real wafers  

---

## Next doc

- Data flow overview: `docs/ADF_TO_DASHBOARD_FLOW.md`  
- Deploy app: `DEPLOY.md`
