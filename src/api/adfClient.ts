import { loadMockAdfBundle } from '../data/mockAdf'
import type { AdfDatasetBundle } from '../data/types'

/**
 * ADF data client.
 *
 * Reads from the wafer-track API which queries Synapse-shaped tables:
 *   dim_location, dim_wafer, fact_wafer_movement, fact_die_test_result
 *
 * Local default: http://localhost:8787 (see api/server.ts)
 * Production: set VITE_ADF_API_BASE to your hosted API.
 */
const API_BASE =
  (import.meta.env.VITE_ADF_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8787'

export async function fetchAdfDataset(): Promise<AdfDatasetBundle> {
  try {
    const res = await fetch(`${API_BASE}/wafer-track/bundle`)
    if (!res.ok) {
      throw new Error(`ADF API ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as AdfDatasetBundle
  } catch (err) {
    // Offline / API not running: fall back to in-browser mock so UI still loads.
    console.warn('ADF API unreachable, using in-browser mock', err)
    await new Promise((r) => setTimeout(r, 200))
    return loadMockAdfBundle()
  }
}

export function adfApiBase() {
  return API_BASE
}
