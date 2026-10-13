import cors from 'cors'
import express from 'express'
import { dbPathUsed, migrate } from './db.js'
import { loadBundle } from './queries.js'
import { seedFabops } from './seed.js'

const PORT = Number(process.env.ADF_API_PORT ?? 8787)

migrate()
seedFabops(false)

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    sink: 'synapse://fabops (sqlite stand-in)',
    db: dbPathUsed(),
  })
})

/**
 * ADF-landed wafer track bundle.
 * Mirrors: GET https://fabops-api.altera.com/wafer-track/bundle
 * Optional: ?lotId=LOT-A2401&asOf=2026-10-12T00:00:00Z
 */
app.get('/wafer-track/bundle', (req, res) => {
  try {
    const lotId =
      typeof req.query.lotId === 'string' && req.query.lotId.trim()
        ? req.query.lotId.trim()
        : undefined
    const asOf =
      typeof req.query.asOf === 'string' && req.query.asOf.trim()
        ? req.query.asOf.trim()
        : undefined

    const bundle = loadBundle({ lotId, asOf })
    res.json(bundle)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to load ADF bundle',
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ADF wafer-track API on http://localhost:${PORT}`)
  console.log(`  GET /wafer-track/bundle`)
  console.log(`  DB  ${dbPathUsed()}`)
})
