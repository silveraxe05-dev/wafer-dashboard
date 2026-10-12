import { loadMockAdfBundle } from '../data/mockAdf'
import type { AdfDatasetBundle } from '../data/types'

/**
 * ADF data client.
 *
 * Production path: Azure Data Factory copies MES / tester feeds into Synapse,
 * Fabric, or ADLS. A thin API (Functions / App Service) exposes those tables.
 * Set VITE_ADF_API_BASE to that API; omit it to use the local ADF-shaped mock.
 */
const API_BASE = import.meta.env.VITE_ADF_API_BASE as string | undefined

export async function fetchAdfDataset(): Promise<AdfDatasetBundle> {
  if (!API_BASE) {
    // Simulate pipeline latency
    await new Promise((r) => setTimeout(r, 280))
    return loadMockAdfBundle()
  }

  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/wafer-track/bundle`)
  if (!res.ok) {
    throw new Error(`ADF API ${res.status}: ${res.statusText}`)
  }
  return (await res.json()) as AdfDatasetBundle
}
