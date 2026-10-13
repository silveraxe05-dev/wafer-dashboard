-- Synapse-shaped ADF landing tables (local SQLite stand-in for fabops.*).
-- Swap DATABASE_URL / connection to Azure Synapse; keep table/column names.

CREATE TABLE IF NOT EXISTS dim_location (
  location_code TEXT PRIMARY KEY,
  location_name TEXT NOT NULL,
  site TEXT NOT NULL,
  sequence_no INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_wafer (
  wafer_id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL,
  product TEXT NOT NULL,
  technology TEXT NOT NULL,
  diameter_mm INTEGER NOT NULL,
  current_location TEXT NOT NULL REFERENCES dim_location(location_code),
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_moved_at TEXT NOT NULL,
  die_count INTEGER NOT NULL,
  tested_die_count INTEGER NOT NULL,
  yield_pct REAL
);

CREATE TABLE IF NOT EXISTS fact_wafer_movement (
  movement_id TEXT PRIMARY KEY,
  wafer_id TEXT NOT NULL REFERENCES dim_wafer(wafer_id),
  from_location TEXT REFERENCES dim_location(location_code),
  to_location TEXT NOT NULL REFERENCES dim_location(location_code),
  equipment_id TEXT,
  operator TEXT,
  status TEXT NOT NULL,
  moved_at TEXT NOT NULL,
  notes TEXT,
  source_pipeline TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_die_test_result (
  result_id INTEGER PRIMARY KEY AUTOINCREMENT,
  wafer_id TEXT NOT NULL REFERENCES dim_wafer(wafer_id),
  die_x INTEGER NOT NULL,
  die_y INTEGER NOT NULL,
  test_stage TEXT NOT NULL, -- CP1 | CP2 | CLASS | FT
  bin_code TEXT NOT NULL,
  hard_bin INTEGER NOT NULL,
  soft_bin INTEGER NOT NULL,
  tested_at TEXT NOT NULL,
  site INTEGER NOT NULL,
  idd_ma REAL,
  voh_v REAL,
  delay_ns REAL
);

CREATE TABLE IF NOT EXISTS adf_pipeline_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pipeline_run_id TEXT NOT NULL,
  landed_at TEXT NOT NULL,
  sink TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_movement_wafer ON fact_wafer_movement(wafer_id, moved_at);
CREATE INDEX IF NOT EXISTS ix_die_wafer_stage ON fact_die_test_result(wafer_id, test_stage);
