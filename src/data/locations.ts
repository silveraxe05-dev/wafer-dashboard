import type { LocationMeta } from './types'

export const LOCATIONS: LocationMeta[] = [
  { code: 'FAB_IN', name: 'Fab Incoming', site: 'Penang', sequence: 1 },
  { code: 'INCOMING_QA', name: 'Incoming QA', site: 'Penang', sequence: 2 },
  { code: 'CP1_PROBE', name: 'CP1 Probe', site: 'Penang', sequence: 3 },
  { code: 'BAKE', name: 'Bake', site: 'Penang', sequence: 4 },
  { code: 'CP2_PROBE', name: 'CP2 Probe', site: 'Penang', sequence: 5 },
  { code: 'INK', name: 'Ink / Mark', site: 'Penang', sequence: 6 },
  { code: 'SORT', name: 'Die Sort', site: 'Penang', sequence: 7 },
  { code: 'ASSEMBLY', name: 'Assembly', site: 'Kulim', sequence: 8 },
  { code: 'FINAL_TEST', name: 'Final Test', site: 'Kulim', sequence: 9 },
  { code: 'SHIP', name: 'Ship Ready', site: 'Kulim', sequence: 10 },
  { code: 'HOLD', name: 'Quality Hold', site: 'Shared', sequence: 99 },
]

export const locationName = (code: string) =>
  LOCATIONS.find((l) => l.code === code)?.name ?? code
