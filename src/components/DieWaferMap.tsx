import type { DieTestResult } from '../data/types'
import { BIN_META, binColor } from '../lib/bins'

interface Props {
  dies: DieTestResult[]
}

export function DieWaferMap({ dies }: Props) {
  if (dies.length === 0) {
    return <div className="empty">No die test results for this stage yet.</div>
  }

  const xs = dies.map((d) => d.dieX)
  const ys = dies.map((d) => d.dieY)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cell = 18
  const pad = 28
  const width = (maxX - minX + 1) * cell + pad * 2
  const height = (maxY - minY + 1) * cell + pad * 2
  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(width, height) / 2 - 8

  return (
    <div>
      <div className="wafer-map-wrap">
        <svg
          className="wafer-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Wafer die bin map"
        >
          <defs>
            <radialGradient id="waferGlow" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#d9e7ef" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#b7c9d6" stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={radius} fill="url(#waferGlow)" stroke="#0a2540" strokeOpacity="0.2" />
          <circle cx={cx} cy={cy} r={radius - 6} fill="none" stroke="#0f8a7d" strokeOpacity="0.25" />
          {dies.map((d, i) => {
            const x = pad + (d.dieX - minX) * cell
            const y = pad + (d.dieY - minY) * cell
            return (
              <rect
                key={`${d.dieX}-${d.dieY}-${d.testStage}`}
                className="die-cell"
                x={x + 1}
                y={y + 1}
                width={cell - 2}
                height={cell - 2}
                rx={2}
                fill={binColor(d.bin)}
                style={{ animationDelay: `${(i % 40) * 8}ms` }}
              >
                <title>{`(${d.dieX},${d.dieY}) ${BIN_META[d.bin].label}`}</title>
              </rect>
            )
          })}
        </svg>
      </div>
      <div className="legend">
        {(Object.keys(BIN_META) as Array<keyof typeof BIN_META>).map((key) => (
          <span key={key} className="legend-item">
            <span className="swatch" style={{ background: BIN_META[key].color }} />
            {BIN_META[key].label}
          </span>
        ))}
      </div>
    </div>
  )
}
