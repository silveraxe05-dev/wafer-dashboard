import { useEffect, useState } from 'react'
import { fetchAdfDataset } from '../api/adfClient'
import type { AdfDatasetBundle } from '../data/types'

export function useAdfData() {
  const [data, setData] = useState<AdfDatasetBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAdfDataset()
      .then((bundle) => {
        if (!cancelled) {
          setData(bundle)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ADF data')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, error, loading, reload: () => setLoading(true) }
}
