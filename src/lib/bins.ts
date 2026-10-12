import type { DieBin } from '../data/types'

export const BIN_META: Record<
  DieBin,
  { label: string; color: string }
> = {
  pass: { label: 'Pass', color: '#1b8a5a' },
  fail_os: { label: 'Open/Short', color: '#c23b3b' },
  fail_leakage: { label: 'Leakage', color: '#d4652f' },
  fail_timing: { label: 'Timing', color: '#b45309' },
  fail_func: { label: 'Functional', color: '#9f1239' },
  edge: { label: 'Edge / Exclusion', color: '#94a3b8' },
  untested: { label: 'Untested', color: '#cbd5e1' },
}

export function binColor(bin: DieBin) {
  return BIN_META[bin].color
}
