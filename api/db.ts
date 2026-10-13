import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')
const dbPath = process.env.ADF_SQLITE_PATH ?? join(dataDir, 'fabops.sqlite')

mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(dbPath)

export function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)
}

export function dbPathUsed() {
  return dbPath
}
