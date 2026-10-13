import type {
  AdfDatasetBundle,
  DieTestResult,
  LocationMeta,
  Wafer,
  WaferMovement,
} from '../src/data/types.js'
import { db } from './db.js'

interface LocRow {
  location_code: string
  location_name: string
  site: string
  sequence_no: number
}

interface WaferRow {
  wafer_id: string
  lot_id: string
  product: string
  technology: string
  diameter_mm: number
  current_location: string
  status: string
  started_at: string
  last_moved_at: string
  die_count: number
  tested_die_count: number
  yield_pct: number | null
}

interface MoveRow {
  movement_id: string
  wafer_id: string
  from_location: string | null
  to_location: string
  equipment_id: string | null
  operator: string | null
  status: string
  moved_at: string
  notes: string | null
  source_pipeline: string
}

interface DieRow {
  wafer_id: string
  die_x: number
  die_y: number
  test_stage: string
  bin_code: string
  hard_bin: number
  soft_bin: number
  tested_at: string
  site: number
  idd_ma: number | null
  voh_v: number | null
  delay_ns: number | null
}

interface MetaRow {
  pipeline_run_id: string
  landed_at: string
  sink: string
}

export function loadBundle(filters?: {
  lotId?: string
  asOf?: string
}): AdfDatasetBundle {
  const meta = db
    .prepare(
      `SELECT pipeline_run_id, landed_at, sink FROM adf_pipeline_meta WHERE id = 1`,
    )
    .get() as MetaRow | undefined

  const locations = (
    db
      .prepare(
        `SELECT location_code, location_name, site, sequence_no
         FROM dim_location ORDER BY sequence_no`,
      )
      .all() as LocRow[]
  ).map(
    (r): LocationMeta => ({
      code: r.location_code as LocationMeta['code'],
      name: r.location_name,
      site: r.site,
      sequence: r.sequence_no,
    }),
  )

  let waferSql = `SELECT * FROM dim_wafer`
  const waferParams: string[] = []
  if (filters?.lotId) {
    waferSql += ` WHERE lot_id = ?`
    waferParams.push(filters.lotId)
  }
  waferSql += ` ORDER BY last_moved_at DESC`

  const wafers = (db.prepare(waferSql).all(...waferParams) as WaferRow[]).map(
    (r): Wafer => ({
      waferId: r.wafer_id,
      lotId: r.lot_id,
      product: r.product,
      technology: r.technology,
      diameterMm: r.diameter_mm,
      currentLocation: r.current_location as Wafer['currentLocation'],
      status: r.status as Wafer['status'],
      startedAt: r.started_at,
      lastMovedAt: r.last_moved_at,
      dieCount: r.die_count,
      testedDieCount: r.tested_die_count,
      yieldPct: r.yield_pct,
    }),
  )

  const waferIds = wafers.map((w) => w.waferId)
  if (waferIds.length === 0) {
    return {
      sourcedFrom: 'adf',
      pipelineRunId: meta?.pipeline_run_id ?? 'adf-run-empty',
      landedAt: meta?.landed_at ?? new Date().toISOString(),
      sink: meta?.sink ?? 'synapse://fabops',
      wafers: [],
      movements: [],
      dieResults: [],
      locations,
    }
  }

  const placeholders = waferIds.map(() => '?').join(',')
  let moveSql = `SELECT * FROM fact_wafer_movement WHERE wafer_id IN (${placeholders})`
  const moveParams: string[] = [...waferIds]
  if (filters?.asOf) {
    moveSql += ` AND moved_at <= ?`
    moveParams.push(filters.asOf)
  }
  moveSql += ` ORDER BY moved_at ASC`

  const movements = (db.prepare(moveSql).all(...moveParams) as MoveRow[]).map(
    (r): WaferMovement => ({
      movementId: r.movement_id,
      waferId: r.wafer_id,
      fromLocation: r.from_location as WaferMovement['fromLocation'],
      toLocation: r.to_location as WaferMovement['toLocation'],
      equipmentId: r.equipment_id,
      operator: r.operator,
      status: r.status as WaferMovement['status'],
      movedAt: r.moved_at,
      notes: r.notes,
      sourcePipeline: r.source_pipeline,
    }),
  )

  let dieSql = `SELECT * FROM fact_die_test_result WHERE wafer_id IN (${placeholders})`
  const dieParams: string[] = [...waferIds]
  if (filters?.asOf) {
    dieSql += ` AND tested_at <= ?`
    dieParams.push(filters.asOf)
  }

  const dieResults = (db.prepare(dieSql).all(...dieParams) as DieRow[]).map(
    (r): DieTestResult => ({
      waferId: r.wafer_id,
      dieX: r.die_x,
      dieY: r.die_y,
      testStage: r.test_stage as DieTestResult['testStage'],
      bin: r.bin_code as DieTestResult['bin'],
      hardBin: r.hard_bin,
      softBin: r.soft_bin,
      testedAt: r.tested_at,
      site: r.site,
      parameters: {
        idd_ma: r.idd_ma ?? 0,
        voh_v: r.voh_v ?? 0,
        delay_ns: r.delay_ns ?? 0,
      },
    }),
  )

  return {
    sourcedFrom: 'adf',
    pipelineRunId: meta?.pipeline_run_id ?? 'adf-run-unknown',
    landedAt: meta?.landed_at ?? new Date().toISOString(),
    sink: meta?.sink ?? 'synapse://fabops',
    wafers,
    movements,
    dieResults,
    locations,
  }
}
