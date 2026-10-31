
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA = resolve(ROOT, 'prisma/schema.prisma')
const MIGRATIONS = resolve(ROOT, 'prisma/migrations')

const BASELINE_NAME = '20261024025905_baseline'
const BASELINE = resolve(MIGRATIONS, BASELINE_NAME, 'migration.sql')

const STATUS_NAME = '20261023212131_add_book_status'
const STATUS = resolve(MIGRATIONS, STATUS_NAME, 'migration.sql')

const PRISMA_CLI = resolve(ROOT, 'node_modules/prisma/build/index.js')

class SetupError extends Error {}

function getTarget(connectionString) {
  let url

  try {
    url = new URL(connectionString)
  } catch {
    throw new SetupError('DATABASE_URL is invalid.')
  }

  if (url.protocol !== 'mysql:') {
    throw new SetupError('Only MySQL databases are supported.')
  }

  let databaseName

  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new SetupError('Database name encoding is invalid.')
  }

  if (!databaseName || url.pathname.split('/').length !== 2) {
    throw new SetupError('DATABASE_URL must specify exactly one database.')
  }

  if (['libread', 'libread_pdf_test'].includes(databaseName)) {
    throw new SetupError('Refusing to run against a protected database.')
  }

  return { databaseName, host: url.host }
}

function runPrisma(args) {
  console.log(`\n> prisma ${args.join(' ')}`)

  const result = spawnSync(
    process.execPath,
    [PRISMA_CLI, ...args],
    { cwd: ROOT, env: process.env, stdio: 'inherit' }
  )

  if (result.error || result.status !== 0) {
    throw new SetupError(
      'A Prisma command failed. Setup stopped; inspect the database before retrying.'
    )
  }
}

function applyMigration(name, file) {
  runPrisma(['db', 'execute', '--file', file, '--schema', SCHEMA])
  runPrisma(['migrate', 'resolve', '--applied', name, '--schema', SCHEMA])
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new SetupError('Run this command in an interactive terminal.')
  }

  if (!process.env.DATABASE_URL) {
    throw new SetupError('DATABASE_URL is required. Check your .env file.')
  }

  for (const file of [SCHEMA, BASELINE, STATUS, PRISMA_CLI]) {
    if (!existsSync(file)) {
      throw new SetupError(`Required project file is missing: ${file}`)
    }
  }

  const target = getTarget(process.env.DATABASE_URL)

  console.log(`\nDatabase target: ${target.host}/${target.databaseName}`)
  console.log('This setup is only for a completely empty database.')
  console.log('It will create tables and apply migrations.')
  console.log('It will not reset or delete data.')

  const terminal = createInterface({ input: stdin, output: stdout })

  try {
    const answer = await terminal.question(
      `Type "${target.databaseName}" to authorize setup: `
    )

    if (answer !== target.databaseName) {
      throw new SetupError('Database confirmation did not match. No changes were made.')
    }
  } finally {
    terminal.close()
  }

  const prisma = new PrismaClient()

  try {
    const rows = await prisma.$queryRaw`SELECT DATABASE() AS databaseName`

    if (rows[0]?.databaseName !== target.databaseName) {
      throw new SetupError('Connected database does not match DATABASE_URL.')
    }

    const tables = await prisma.$queryRawUnsafe('SHOW FULL TABLES')

    if (tables.length !== 0) {
      throw new SetupError(
        `Database is not empty (${tables.length} table/view entries found). No migration was run.`
      )
    }

    console.log('Preflight passed: connected to the confirmed empty database.')
  } finally {
    await prisma.$disconnect()
  }

  // 1. Create the original schema.
  applyMigration(BASELINE_NAME, BASELINE)

  // 2. Apply Book Status after the books table exists.
  applyMigration(STATUS_NAME, STATUS)

  // 3. Apply remaining migrations, including Book Categories.
  runPrisma(['migrate', 'deploy', '--schema', SCHEMA])

  // 4. Verify migration status.
  runPrisma(['migrate', 'status', '--schema', SCHEMA])

  console.log('\nDatabase setup completed. Review the migration status above.')
}

try {
  await main()
} catch (error) {
  console.error(`\nDatabase setup stopped: ${error.message}`)
  process.exitCode = 1
}
