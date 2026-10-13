import { LOCATIONS } from './locations'
import type {
  AdfDatasetBundle,
  DieBin,
  DieTestResult,
  LocationCode,
  TestStage,
  Wafer,
  WaferMovement,
} from './types'

const PRODUCTS = [
  { product: 'GDR', technology: 'GDR', lotPrefix: 'LOT-GDR' },
  { product: 'RNR', technology: 'RNR', lotPrefix: 'LOT-RNR' },
  { product: 'WHR', technology: 'WHR', lotPrefix: 'LOT-WHR' },
  { product: 'FP8', technology: 'FP8', lotPrefix: 'LOT-FP8' },
  { product: 'Agilex 7 M-Series', technology: 'Intel 7', lotPrefix: 'LOT-AGX' },
  { product: 'Stratix 10 GX', technology: '14nm', lotPrefix: 'LOT-S10' },
]

const FLOW: LocationCode[] = [
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
]

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

function generateDieMap(
  waferId: string,
  stage: TestStage,
  radius: number,
  rand: () => number,
  hoursAgo: number,
): DieTestResult[] {
  const results: DieTestResult[] = []
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist = Math.sqrt(x * x + y * y)
      if (dist > radius + 0.2) continue

      let bin: DieBin = 'pass'
      const r = rand()
      const failScale = stage === 'CLASS' || stage === 'FT' ? 0.7 : 1
      if (dist > radius - 0.6) bin = 'edge'
      else if (r < 0.03 * failScale) bin = 'fail_os'
      else if (r < 0.055 * failScale) bin = 'fail_leakage'
      else if (r < 0.075 * failScale) bin = 'fail_timing'
      else if (r < 0.09 * failScale) bin = 'fail_func'
      else if (r < 0.1 * failScale) bin = 'untested'

      const hardBin =
        bin === 'pass' ? 1 : bin === 'edge' ? 8 : bin === 'untested' ? 0 : 5

      results.push({
        waferId,
        dieX: x,
        dieY: y,
        testStage: stage,
        bin,
        hardBin,
        softBin: hardBin * 10 + Math.floor(rand() * 3),
        testedAt: isoHoursAgo(hoursAgo - rand() * 2),
        site: 1 + Math.floor(rand() * 4),
        parameters: {
          idd_ma: +(12 + rand() * 8).toFixed(3),
          voh_v: +(1.1 + rand() * 0.15).toFixed(3),
          delay_ns: +(0.4 + rand() * 0.35).toFixed(3),
        },
      })
    }
  }
  return results
}

function buildWafer(index: number): {
  wafer: Wafer
  movements: WaferMovement[]
  dies: DieTestResult[]
} {
  const rand = seeded(1000 + index)
  const meta = PRODUCTS[index % PRODUCTS.length]
  const lotNum = 2400 + Math.floor(index / PRODUCTS.length)
  const lotId = `${meta.lotPrefix}-${lotNum}`
  const waferId = `${lotId}-W${String((Math.floor(index / PRODUCTS.length) % 25) + 1).padStart(2, '0')}`
  const progress = Math.min(FLOW.length - 1, 2 + Math.floor(rand() * 9))
  const onHold = rand() < 0.12
  const currentLocation: LocationCode = onHold ? 'HOLD' : FLOW[progress]
  const startedHours = 180 - index * 7
  const lastMovedHours = startedHours - progress * 14 - rand() * 6

  const movements: WaferMovement[] = []
  for (let i = 0; i <= progress; i++) {
    const to = FLOW[i]
    const from = i === 0 ? null : FLOW[i - 1]
    movements.push({
      movementId: `${waferId}-M${i + 1}`,
      waferId,
      fromLocation: from,
      toLocation: to,
      equipmentId: to.includes('PROBE') || to.includes('TEST')
        ? `TST-${100 + Math.floor(rand() * 20)}`
        : `EQ-${200 + Math.floor(rand() * 40)}`,
      operator: rand() > 0.3 ? `OP${1000 + Math.floor(rand() * 40)}` : null,
      status: i === progress ? (onHold ? 'hold' : 'processing') : 'complete',
      movedAt: isoHoursAgo(startedHours - i * 14 - rand() * 3),
      notes: i === 7 && rand() > 0.7 ? 'Class bin disposition pending' : null,
      sourcePipeline: 'adf-wafer-mes-ingest',
    })
  }

  if (onHold) {
    movements.push({
      movementId: `${waferId}-MHOLD`,
      waferId,
      fromLocation: FLOW[progress],
      toLocation: 'HOLD',
      equipmentId: null,
      operator: 'QA-HOLD',
      status: 'hold',
      movedAt: isoHoursAgo(lastMovedHours - 1),
      notes: 'Parametric excursion — awaiting disposition',
      sourcePipeline: 'adf-wafer-mes-ingest',
    })
  }

  const dies: DieTestResult[] = []
  if (progress >= 2) dies.push(...generateDieMap(waferId, 'CP1', 8, rand, lastMovedHours + 40))
  if (progress >= 4) dies.push(...generateDieMap(waferId, 'CP2', 8, rand, lastMovedHours + 25))
  if (progress >= 7) dies.push(...generateDieMap(waferId, 'CLASS', 8, rand, lastMovedHours + 12))
  if (progress >= 9) dies.push(...generateDieMap(waferId, 'FT', 8, rand, lastMovedHours + 3))

  const latestStage: TestStage | null =
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
    ? dies.filter((d) => d.testStage === latestStage && d.bin !== 'edge' && d.bin !== 'untested')
    : []
  const pass = latest.filter((d) => d.bin === 'pass').length
  const yieldPct = latest.length ? +((pass / latest.length) * 100).toFixed(1) : null

  const wafer: Wafer = {
    waferId,
    lotId,
    product: meta.product,
    technology: meta.technology,
    diameterMm: 300,
    currentLocation,
    status: onHold ? 'hold' : progress >= FLOW.length - 1 ? 'complete' : 'processing',
    startedAt: isoHoursAgo(startedHours),
    lastMovedAt: isoHoursAgo(lastMovedHours),
    dieCount: dies.length || 196,
    testedDieCount: latest.length,
    yieldPct,
  }

  return { wafer, movements, dies }
}

/** In-browser fallback when the ADF API is unreachable. */
export function loadMockAdfBundle(): AdfDatasetBundle {
  const wafers: Wafer[] = []
  const movements: WaferMovement[] = []
  const dieResults: DieTestResult[] = []

  for (let i = 0; i < 24; i++) {
    const built = buildWafer(i)
    wafers.push(built.wafer)
    movements.push(...built.movements)
    dieResults.push(...built.dies)
  }

  return {
    sourcedFrom: 'adf',
    pipelineRunId: `adf-run-${new Date().toISOString().slice(0, 10)}-wafer-mes`,
    landedAt: new Date().toISOString(),
    sink: 'fallback-mock (start api with npm run api)',
    wafers,
    movements,
    dieResults,
    locations: LOCATIONS,
  }
}
