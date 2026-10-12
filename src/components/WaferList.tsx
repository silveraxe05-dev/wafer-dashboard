import { formatDistanceToNow } from 'date-fns'
import type { Wafer } from '../data/types'
import { locationName } from '../data/locations'

interface Props {
  wafers: Wafer[]
  selectedId: string | null
  onSelect: (waferId: string) => void
}

export function WaferList({ wafers, selectedId, onSelect }: Props) {
  return (
    <aside className="panel">
      <div className="panel-pad" style={{ paddingBottom: 8 }}>
        <h2 className="panel-title">Wafer queue</h2>
        <p className="panel-meta">{wafers.length} wafers in view</p>
      </div>
      <div className="wafer-list">
        {wafers.length === 0 && <div className="empty">No wafers match filters.</div>}
        {wafers.map((w) => {
          const lowYield = w.yieldPct != null && w.yieldPct < 90
          return (
            <button
              key={w.waferId}
              type="button"
              className={`wafer-item${selectedId === w.waferId ? ' active' : ''}`}
              onClick={() => onSelect(w.waferId)}
            >
              <div className="wafer-id">{w.waferId}</div>
              <div className="wafer-meta-row">
                <span>{w.product}</span>
                <span
                  className={`badge ${w.status === 'hold' ? 'hold' : 'loc'}`}
                >
                  {locationName(w.currentLocation)}
                </span>
                {w.yieldPct != null && (
                  <span className={`badge yield${lowYield ? ' low' : ''}`}>
                    {w.yieldPct}% yield
                  </span>
                )}
              </div>
              <div className="wafer-meta-row">
                Moved{' '}
                {formatDistanceToNow(new Date(w.lastMovedAt), { addSuffix: true })}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
