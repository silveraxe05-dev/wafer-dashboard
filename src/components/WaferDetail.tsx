import { format } from 'date-fns'
import type { DieTestResult, Wafer, WaferMovement } from '../data/types'
import { locationName } from '../data/locations'
import { MovementTimeline } from './MovementTimeline'
import { TestResultsPanel } from './TestResultsPanel'

interface Props {
  wafer: Wafer
  movements: WaferMovement[]
  dies: DieTestResult[]
}

export function WaferDetail({ wafer, movements, dies }: Props) {
  return (
    <div className="detail-stack">
      <section className="panel hero-detail">
        <div className="hero-copy">
          <p className="hero-kicker">Selected wafer</p>
          <h2 className="hero-title">{wafer.waferId}</h2>
          <p className="hero-line">
            {wafer.product} · {wafer.technology} · now at{' '}
            <strong>{locationName(wafer.currentLocation)}</strong>
            {wafer.status === 'hold' ? ' (quality hold)' : ''}. Track station moves and
            die-level bins landed from ADF.
          </p>
        </div>
        <dl className="stat-grid">
          <div className="stat">
            <dt>Lot</dt>
            <dd className="mono">{wafer.lotId}</dd>
          </div>
          <div className="stat">
            <dt>Yield</dt>
            <dd>{wafer.yieldPct != null ? `${wafer.yieldPct}%` : '—'}</dd>
          </div>
          <div className="stat">
            <dt>Tested dies</dt>
            <dd>
              {wafer.testedDieCount}
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {' '}
                / {wafer.dieCount}
              </span>
            </dd>
          </div>
          <div className="stat">
            <dt>Last move</dt>
            <dd style={{ fontSize: '0.95rem' }}>
              {format(new Date(wafer.lastMovedAt), 'MMM d, HH:mm')}
            </dd>
          </div>
        </dl>
      </section>

      <MovementTimeline
        movements={movements}
        currentLocation={wafer.currentLocation}
      />
      <TestResultsPanel dies={dies} />
    </div>
  )
}
