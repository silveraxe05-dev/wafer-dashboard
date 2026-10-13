import { useMemo, useState } from 'react'
import { FiltersBar } from './components/FiltersBar'
import { LocationBoard } from './components/LocationBoard'
import { WaferDetail } from './components/WaferDetail'
import { WaferList } from './components/WaferList'
import type { DashboardFilters } from './data/types'
import { adfApiBase } from './api/adfClient'
import { useAdfData } from './hooks/useAdfData'
import { format } from 'date-fns'

const initialFilters: DashboardFilters = {
  lotId: 'all',
  location: 'all',
  product: 'all',
  query: '',
}

export default function App() {
  const { data, error, loading } = useAdfData()
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    const q = filters.query.trim().toLowerCase()
    return data.wafers.filter((w) => {
      if (filters.lotId !== 'all' && w.lotId !== filters.lotId) return false
      if (filters.location !== 'all' && w.currentLocation !== filters.location) return false
      if (filters.product !== 'all' && w.product !== filters.product) return false
      if (
        q &&
        !w.waferId.toLowerCase().includes(q) &&
        !w.lotId.toLowerCase().includes(q) &&
        !w.product.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [data, filters])

  const activeId =
    selectedId && filtered.some((w) => w.waferId === selectedId)
      ? selectedId
      : filtered[0]?.waferId ?? null

  const wafer = data?.wafers.find((w) => w.waferId === activeId) ?? null
  const movements =
    data?.movements
      .filter((m) => m.waferId === activeId)
      .sort(
        (a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime(),
      ) ?? []
  const dies = data?.dieResults.filter((d) => d.waferId === activeId) ?? []

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            Wafer<span>Track</span>
          </div>
          <p className="brand-sub">
            Follow wafers across fab locations and inspect die test bins from the same
            ADF-landed dataset.
          </p>
        </div>
        {data && (
          <div className="adf-chip" title={`${data.sink} · ${adfApiBase()}`}>
            <span className="adf-dot" />
            ADF API · <strong>{data.pipelineRunId}</strong>
            <span>· landed {format(new Date(data.landedAt), 'HH:mm:ss')}</span>
          </div>
        )}
      </header>

      {loading && <div className="panel state">Loading ADF wafer dataset…</div>}
      {error && <div className="panel state error">{error}</div>}

      {data && !loading && (
        <>
          <FiltersBar
            wafers={data.wafers}
            filters={filters}
            onChange={setFilters}
            locations={data.locations}
          />
          <LocationBoard wafers={filtered} locations={data.locations} />
          <div className="layout" style={{ marginTop: 18 }}>
            <WaferList
              wafers={filtered}
              selectedId={activeId}
              onSelect={setSelectedId}
            />
            {wafer ? (
              <WaferDetail wafer={wafer} movements={movements} dies={dies} />
            ) : (
              <div className="panel state">Select a wafer to inspect movements and dies.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
