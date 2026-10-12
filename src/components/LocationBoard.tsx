import type { Wafer } from '../data/types'
import { LOCATIONS } from '../data/locations'

interface Props {
  wafers: Wafer[]
}

export function LocationBoard({ wafers }: Props) {
  const counts = LOCATIONS.map((loc) => ({
    ...loc,
    count: wafers.filter((w) => w.currentLocation === loc.code).length,
  })).filter((l) => l.code !== 'HOLD' || l.count > 0)

  return (
    <section className="panel panel-pad">
      <div className="section-head">
        <div>
          <h2 className="panel-title">Wafers by location</h2>
          <p className="panel-meta">Live snapshot from ADF-landed MES movements</p>
        </div>
      </div>
      <div className="location-board">
        {counts.map((loc) => (
          <div key={loc.code} className="loc-cell">
            <h4>{loc.name}</h4>
            <p>{loc.count}</p>
            <small>{loc.site}</small>
          </div>
        ))}
      </div>
    </section>
  )
}
