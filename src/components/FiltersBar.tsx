import type { DashboardFilters, LocationCode, LocationMeta, Wafer } from '../data/types'
import { LOCATIONS } from '../data/locations'

interface Props {
  wafers: Wafer[]
  filters: DashboardFilters
  onChange: (next: DashboardFilters) => void
  locations?: LocationMeta[]
}

export function FiltersBar({
  wafers,
  filters,
  onChange,
  locations = LOCATIONS,
}: Props) {
  const lots = Array.from(new Set(wafers.map((w) => w.lotId))).sort()
  const products = Array.from(new Set(wafers.map((w) => w.product))).sort()

  return (
    <div className="filters">
      <div className="field">
        <label htmlFor="q">Search wafer / lot</label>
        <input
          id="q"
          value={filters.query}
          placeholder="LOT-A2401 or W03"
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="lot">Lot</label>
        <select
          id="lot"
          value={filters.lotId}
          onChange={(e) =>
            onChange({ ...filters, lotId: e.target.value as DashboardFilters['lotId'] })
          }
        >
          <option value="all">All lots</option>
          {lots.map((lot) => (
            <option key={lot} value={lot}>
              {lot}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="loc">Current location</label>
        <select
          id="loc"
          value={filters.location}
          onChange={(e) =>
            onChange({
              ...filters,
              location: e.target.value as LocationCode | 'all',
            })
          }
        >
          <option value="all">All locations</option>
          {locations.map((loc) => (
            <option key={loc.code} value={loc.code}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="product">Product</label>
        <select
          id="product"
          value={filters.product}
          onChange={(e) =>
            onChange({ ...filters, product: e.target.value as DashboardFilters['product'] })
          }
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
