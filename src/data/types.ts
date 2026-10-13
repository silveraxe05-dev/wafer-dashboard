/** ADF-landed wafer movement & die test schemas (Synapse / SQL / ADLS → API). */

export type LocationCode =
  | 'FAB_IN'
  | 'INCOMING_QA'
  | 'CP1_PROBE'
  | 'CP2_PROBE'
  | 'BAKE'
  | 'INK'
  | 'SORT'
  | 'CLASS_TEST'
  | 'ASSEMBLY'
  | 'FINAL_TEST'
  | 'SHIP'
  | 'HOLD'

export type MovementStatus = 'in_transit' | 'arrived' | 'processing' | 'complete' | 'hold'

export type TestStage = 'CP1' | 'CP2' | 'CLASS' | 'FT'

export type DieBin =
  | 'pass'
  | 'fail_os'
  | 'fail_leakage'
  | 'fail_timing'
  | 'fail_func'
  | 'edge'
  | 'untested'

export interface Wafer {
  waferId: string
  lotId: string
  product: string
  technology: string
  diameterMm: number
  currentLocation: LocationCode
  status: MovementStatus
  startedAt: string
  lastMovedAt: string
  dieCount: number
  testedDieCount: number
  yieldPct: number | null
}

export interface WaferMovement {
  movementId: string
  waferId: string
  fromLocation: LocationCode | null
  toLocation: LocationCode
  equipmentId: string | null
  operator: string | null
  status: MovementStatus
  movedAt: string
  notes: string | null
  sourcePipeline: string
}

export interface DieTestResult {
  waferId: string
  dieX: number
  dieY: number
  testStage: TestStage
  bin: DieBin
  hardBin: number
  softBin: number
  testedAt: string
  site: number
  parameters: Record<string, number>
}

export interface LocationMeta {
  code: LocationCode
  name: string
  site: string
  sequence: number
}

export interface AdfDatasetBundle {
  sourcedFrom: 'adf'
  pipelineRunId: string
  landedAt: string
  sink: string
  wafers: Wafer[]
  movements: WaferMovement[]
  dieResults: DieTestResult[]
  locations: LocationMeta[]
}

export interface DashboardFilters {
  lotId: string | 'all'
  location: LocationCode | 'all'
  product: string | 'all'
  query: string
}
