import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DieTestResult, TestStage } from '../data/types'
import { BIN_META } from '../lib/bins'
import { DieWaferMap } from './DieWaferMap'

interface Props {
  dies: DieTestResult[]
}

type Stage = TestStage

export function TestResultsPanel({ dies }: Props) {
  const stages = useMemo(() => {
    const order: Stage[] = ['CP1', 'CP2', 'CLASS', 'FT']
    const present = new Set(dies.map((d) => d.testStage))
    return order.filter((s) => present.has(s))
  }, [dies])

  const [stage, setStage] = useState<Stage | null>(null)
  const active = stage && stages.includes(stage) ? stage : stages[stages.length - 1] ?? null
  const stageDies = active ? dies.filter((d) => d.testStage === active) : []

  const scored = stageDies.filter((d) => d.bin !== 'edge' && d.bin !== 'untested')
  const pass = scored.filter((d) => d.bin === 'pass').length
  const yieldPct = scored.length ? ((pass / scored.length) * 100).toFixed(1) : '—'

  const binCounts = Object.keys(BIN_META).map((bin) => {
    const count = stageDies.filter((d) => d.bin === bin).length
    return {
      bin,
      label: BIN_META[bin as keyof typeof BIN_META].label,
      count,
      color: BIN_META[bin as keyof typeof BIN_META].color,
    }
  }).filter((b) => b.count > 0)

  const maxCount = Math.max(...binCounts.map((b) => b.count), 1)

  return (
    <section className="panel panel-pad">
      <div className="section-head">
        <div>
          <h2 className="panel-title">Die test results</h2>
          <p className="panel-meta">
            {active
              ? `${active} · ${yieldPct}% yield on ${scored.length} tested dies`
              : 'No tester data landed yet'}
          </p>
        </div>
        {stages.length > 0 && (
          <div className="stage-tabs">
            {stages.map((s) => (
              <button
                key={s}
                type="button"
                className={active === s ? 'active' : ''}
                onClick={() => setStage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {stageDies.length === 0 ? (
        <div className="empty">
          Probe / class / final-test results appear after ADF lands STDF summaries.
        </div>
      ) : (
        <div className="map-grid">
          <DieWaferMap dies={stageDies} />
          <div>
            <h3 className="panel-title" style={{ marginBottom: 10 }}>
              Bin breakdown
            </h3>
            <div className="bins">
              {binCounts.map((b) => (
                <div key={b.bin} className="bin-row">
                  <span>{b.label}</span>
                  <strong style={{ fontFamily: 'var(--mono)' }}>{b.count}</strong>
                  <div className="bin-bar">
                    <span
                      style={{
                        width: `${(b.count / maxCount) * 100}%`,
                        background: b.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-wrap" style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={binCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,37,64,0.08)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f8a7d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
