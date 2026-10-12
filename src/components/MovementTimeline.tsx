import { format } from 'date-fns'
import type { WaferMovement } from '../data/types'
import { locationName } from '../data/locations'

interface Props {
  movements: WaferMovement[]
  currentLocation: string
}

export function MovementTimeline({ movements, currentLocation }: Props) {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime(),
  )

  return (
    <section className="panel panel-pad">
      <div className="section-head">
        <div>
          <h2 className="panel-title">Movement history</h2>
          <p className="panel-meta">Station-to-station trail from ADF MES ingest</p>
        </div>
      </div>
      <div className="timeline">
        {sorted.map((m) => {
          const isCurrent = m.toLocation === currentLocation
          const isHold = m.toLocation === 'HOLD' || m.status === 'hold'
          return (
            <div key={m.movementId} className="timeline-item">
              <div className={`dot${isHold ? ' hold' : ''}${isCurrent ? ' current' : ''}`} />
              <div>
                <p className="move-title">
                  {m.fromLocation
                    ? `${locationName(m.fromLocation)} → ${locationName(m.toLocation)}`
                    : `Received at ${locationName(m.toLocation)}`}
                </p>
                <p className="move-meta">
                  {format(new Date(m.movedAt), 'MMM d, HH:mm')}
                  {m.equipmentId ? ` · ${m.equipmentId}` : ''}
                  {m.operator ? ` · ${m.operator}` : ''}
                  {` · ${m.status}`}
                </p>
                {m.notes && <p className="move-notes">{m.notes}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
