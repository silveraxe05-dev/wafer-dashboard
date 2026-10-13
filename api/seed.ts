import { db, migrate, dbPathUsed } from './db.js'

const LOCATIONS = [
  ['FAB_IN', 'Fab Incoming', 'Penang', 1],
  ['INCOMING_QA', 'Incoming QA', 'Penang', 2],
  ['CP1_PROBE', 'CP1 Probe', 'Penang', 3],
  ['BAKE', 'Bake', 'Penang', 4],
  ['CP2_PROBE', 'CP2 Probe', 'Penang', 5],
  ['INK', 'Ink / Mark', 'Penang', 6],
  ['SORT', 'Die Sort', 'Penang', 7],
  ['CLASS_TEST', 'Class Test', 'Kulim', 8],
  ['ASSEMBLY', 'Assembly', 'Kulim', 9],
  ['FINAL_TEST', 'Final Test', 'Kulim', 10],
  ['SHIP', 'Ship Ready', 'Kulim', 11],
  ['HOLD', 'Quality Hold', 'Shared', 99],
] as const

const PRODUCTS = [
  { product: 'GDR', technology: 'GDR', lotPrefix: 'LOT-GDR' },
  { product: 'RNR', technology: 'RNR', lotPrefix: 'LOT-RNR' },
  { product: 'WHR', technology: 'WHR', lotPrefix: 'LOT-WHR' },
  { product: 'FP8', technology: 'FP8', lotPrefix: 'LOT-FP8' },
  { product: 'Agilex 7 M-Series', technology: 'Intel 7', lotPrefix: 'LOT-AGX' },
  { product: 'Stratix 10 GX', technology: '14nm', lotPrefix: 'LOT-S10' },
]

const FLOW = [
  'FAB_IN',
  'INCOMING_QA',
  'CP1_PROBE',
  'BAKE',
  'CP2_PROBE',
  'INK',
  'SORT',
  'CLASS_TEST',
  'ASSEMBLY',
  'FINAL_TEST',
  'SHIP',
] as const

type Stage = 'CP1' | 'CP2' | 'CLASS' | 'FT'
type Bin =
  | 'pass'
  | 'fail_os'
  | 'fail_leakage'
  | 'fail_timing'
  | 'fail_func'
  | 'edge'
  | 'untested'

function seeded(n: number) {
  let x = (n * 9301 + 49297) % 233280
  return () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
}

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

function generateDies(
  waferId: string,
  stage: Stage,
  radius: number,
  rand: () => number,
  hoursAgo: number,
) {
  const rows: Array<{
    waferId: string
    dieX: number
    dieY: number
    stage: Stage
    bin: Bin
    hardBin: number
    softBin: number
    testedAt: string
    site: number
    idd: number
    voh: number
    delay: number
  }> = []

  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist = Math.sqrt(x * x + y * y)
      if (dist > radius + 0.2) continue

      let bin: Bin = 'pass'
      const r = rand()
      // Class / FT tend to catch fewer edge fails; slightly different fail mix
      const failScale = stage === 'CLASS' || stage === 'FT' ? 0.7 : 1
      if (dist > radius - 0.6) bin = 'edge'
      else if (r < 0.03 * failScale) bin = 'fail_os'
      else if (r < 0.055 * failScale) bin = 'fail_leakage'
      else if (r < 0.075 * failScale) bin = 'fail_timing'
      else if (r < 0.09 * failScale) bin = 'fail_func'
      else if (r < 0.1 * failScale) bin = 'untested'

      const hardBin =
        bin === 'pass' ? 1 : bin === 'edge' ? 8 : bin === 'untested' ? 0 : 5

      rows.push({
        waferId,
        dieX: x,
        dieY: y,
        stage,
        bin,
        hardBin,
        softBin: hardBin * 10 + Math.floor(rand() * 3),
        testedAt: isoHoursAgo(hoursAgo - rand() * 2),
        site: 1 + Math.floor(rand() * 4),
        idd: +(12 + rand() * 8).toFixed(3),
        voh: +(1.1 + rand() * 0.15).toFixed(3),
        delay: +(0.4 + rand() * 0.35).toFixed(3),
      })
    }
  }
  return rows
}

function yieldOf(dies: ReturnType<typeof generateDies>) {
  const scored = dies.filter((d) => d.bin !== 'edge' && d.bin !== 'untested')
  if (!scored.length) return { tested: 0, yieldPct: null as number | null }
  const pass = scored.filter((d) => d.bin === 'pass').length
  return {
    tested: scored.length,
    yieldPct: +((pass / scored.length) * 100).toFixed(1),
  }
}

export function seedFabops(force = false) {
  migrate()

  const existing = db.prepare('SELECT COUNT(*) AS c FROM dim_wafer').get() as {
    c: number
  }
  if (existing.c > 0 && !force) {
    console.log(`Seed skipped (dim_wafer already has ${existing.c} rows) → ${dbPathUsed()}`)
    return
  }

  db.exec('DELETE FROM fact_die_test_result')
  db.exec('DELETE FROM fact_wafer_movement')
  db.exec('DELETE FROM dim_wafer')
  db.exec('DELETE FROM dim_location')
  db.exec('DELETE FROM adf_pipeline_meta')

  const insertLoc = db.prepare(
    `INSERT INTO dim_location (location_code, location_name, site, sequence_no)
     VALUES (?, ?, ?, ?)`,
  )
  for (const loc of LOCATIONS) insertLoc.run(...loc)

  const insertWafer = db.prepare(
    `INSERT INTO dim_wafer (
      wafer_id, lot_id, product, technology, diameter_mm, current_location,
      status, started_at, last_moved_at, die_count, tested_die_count, yield_pct
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertMove = db.prepare(
    `INSERT INTO fact_wafer_movement (
      movement_id, wafer_id, from_location, to_location, equipment_id, operator,
      status, moved_at, notes, source_pipeline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const insertDie = db.prepare(
    `INSERT INTO fact_die_test_result (
      wafer_id, die_x, die_y, test_stage, bin_code, hard_bin, soft_bin,
      tested_at, site, idd_ma, voh_v, delay_ns
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  const insertMany = db.prepare('BEGIN')
  insertMany.run()
  try {
    // Ensure GDR / RNR / WHR / FP8 each have multiple wafers in the queue
    for (let i = 0; i < 24; i++) {
      const rand = seeded(2000 + i)
      const meta = PRODUCTS[i % PRODUCTS.length]
      const lotNum = 2400 + Math.floor(i / PRODUCTS.length)
      const lotId = `${meta.lotPrefix}-${lotNum}`
      const waferId = `${lotId}-W${String((Math.floor(i / PRODUCTS.length) % 25) + 1).padStart(2, '0')}`
      const progress = Math.min(FLOW.length - 1, 2 + Math.floor(rand() * 9))
      const onHold = rand() < 0.1
      const currentLocation = onHold ? 'HOLD' : FLOW[progress]
      const startedHours = 200 - i * 8
      const lastMovedHours = startedHours - progress * 12 - rand() * 5

      const allDies = []
      if (progress >= 2) {
        allDies.push(
          ...generateDies(waferId, 'CP1', 8, rand, lastMovedHours + 40),
        )
      }
      if (progress >= 4) {
        allDies.push(
          ...generateDies(waferId, 'CP2', 8, rand, lastMovedHours + 25),
        )
      }
      if (progress >= 7) {
        allDies.push(
          ...generateDies(waferId, 'CLASS', 8, rand, lastMovedHours + 12),
        )
      }
      if (progress >= 9) {
        allDies.push(
          ...generateDies(waferId, 'FT', 8, rand, lastMovedHours + 3),
        )
      }

      const latestStage: Stage | null =
        progress >= 9
          ? 'FT'
          : progress >= 7
            ? 'CLASS'
            : progress >= 4
              ? 'CP2'
              : progress >= 2
                ? 'CP1'
                : null
      const latest = latestStage
        ? allDies.filter((d) => d.stage === latestStage)
        : []
      const { tested, yieldPct } = yieldOf(latest)

      // dim_wafer first (FK parent), then movements + die results
      insertWafer.run(
        waferId,
        lotId,
        meta.product,
        meta.technology,
        300,
        currentLocation,
        onHold ? 'hold' : progress >= FLOW.length - 1 ? 'complete' : 'processing',
        isoHoursAgo(startedHours),
        isoHoursAgo(lastMovedHours),
        allDies.length || 196,
        tested,
        yieldPct,
      )

      for (let step = 0; step <= progress; step++) {
        const to = FLOW[step]
        const from = step === 0 ? null : FLOW[step - 1]
        insertMove.run(
          `${waferId}-M${step + 1}`,
          waferId,
          from,
          to,
          to.includes('PROBE') || to.includes('TEST')
            ? `TST-${100 + Math.floor(rand() * 30)}`
            : `EQ-${200 + Math.floor(rand() * 40)}`,
          rand() > 0.25 ? `OP${1000 + Math.floor(rand() * 40)}` : null,
          step === progress ? (onHold ? 'hold' : 'processing') : 'complete',
          isoHoursAgo(startedHours - step * 12 - rand() * 2),
          step === 7 && rand() > 0.75 ? 'Class bin disposition pending' : null,
          'adf-wafer-mes-ingest',
        )
      }

      if (onHold) {
        insertMove.run(
          `${waferId}-MHOLD`,
          waferId,
          FLOW[progress],
          'HOLD',
          null,
          'QA-HOLD',
          'hold',
          isoHoursAgo(lastMovedHours - 1),
          'Parametric excursion — awaiting disposition',
          'adf-wafer-mes-ingest',
        )
      }

      for (const d of allDies) {
        insertDie.run(
          d.waferId,
          d.dieX,
          d.dieY,
          d.stage,
          d.bin,
          d.hardBin,
          d.softBin,
          d.testedAt,
          d.site,
          d.idd,
          d.voh,
          d.delay,
        )
      }
    }

    db.prepare(
      `INSERT INTO adf_pipeline_meta (id, pipeline_run_id, landed_at, sink)
       VALUES (1, ?, ?, ?)`,
    ).run(
      `adf-run-${new Date().toISOString().slice(0, 10)}-wafer-mes`,
      new Date().toISOString(),
      'synapse://fabops (dim_wafer, fact_wafer_movement, fact_die_test_result, dim_location)',
    )

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  console.log(`Seeded fabops SQLite at ${dbPathUsed()}`)
}

const isMain =
  process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')
if (isMain) {
  seedFabops(process.argv.includes('--force'))
}
