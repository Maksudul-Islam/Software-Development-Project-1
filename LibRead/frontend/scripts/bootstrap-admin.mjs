import { emitKeypressEvents } from 'node:readline'
import { createInterface } from 'node:readline/promises'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const DATABASE_NAME = 'libread'
const ADMIN_LOCK_NAME = 'libread:first-admin-bootstrap'
const prisma = new PrismaClient()

class BootstrapError extends Error {}

function getDatabaseTarget(connectionString) {
  let url
  try {
    url = new URL(connectionString)
  } catch {
    throw new BootstrapError('DATABASE_URL is invalid.')
  }

  if (url.protocol !== 'mysql:') {
    throw new BootstrapError('DATABASE_URL must target a MySQL database.')
  }

  let databaseName
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new BootstrapError('DATABASE_URL contains an invalid database name.')
  }

  if (databaseName === 'libread_pdf_test') {
    throw new BootstrapError('Refusing to use the disposable libread_pdf_test database.')
  }
  if (databaseName !== DATABASE_NAME || url.pathname.split('/').length !== 2) {
    throw new BootstrapError('Refusing to run unless DATABASE_URL targets exactly the libread database.')
  }

  return { databaseName, host: url.host }
}

function validateCredentials(nameInput, emailInput, password, confirmation) {
  const name = nameInput.trim()
  const email = emailInput.trim().toLowerCase()

  if (name.length < 2 || name.length > 100) {
    throw new BootstrapError('Name must be between 2 and 100 characters.')
  }
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BootstrapError('Enter a valid email address of at most 100 characters.')
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new BootstrapError('Password must be at least 8 characters and no more than 72 UTF-8 bytes.')
  }
  if (password !== confirmation) {
    throw new BootstrapError('The passwords did not match.')
  }

  return { name, email, password }
}

async function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    let value = ''
    const input = process.stdin
    const wasRaw = input.isRaw
    const wasPaused = input.isPaused()
    let finished = false

    function finish(error) {
      if (finished) return
      finished = true

      let cleanupError
      function safely(cleanup) {
        try {
          cleanup()
        } catch (caught) {
          cleanupError ??= caught
        }
      }

      safely(() => input.removeListener('keypress', onKeypress))
      safely(() => input.removeListener('error', onInputError))
      safely(() => input.removeListener('end', onInputEnd))
      safely(() => input.setRawMode(wasRaw))
      safely(() => {
        if (wasPaused) input.pause()
        else input.resume()
      })
      safely(() => process.stdout.write('\n'))

      const resultError = error ?? cleanupError
      if (resultError) reject(resultError)
      else resolve(value)
      value = ''
    }

    function onKeypress(character, key) {
      if (finished) return
      try {
        if (key.ctrl && key.name === 'c') {
          finish(new BootstrapError('Bootstrap cancelled.'))
        } else if (key.name === 'return' || key.name === 'enter') {
          finish()
        } else if (key.name === 'backspace') {
          value = value.slice(0, -1)
        } else if (character && !key.ctrl && !key.meta && value.length < 256) {
          value += character
        } else if (character && !key.ctrl && !key.meta) {
          finish(new BootstrapError('Password input is too long.'))
        }
      } catch (error) {
        finish(error)
      }
    }

    function onInputError(error) {
      finish(error)
    }

    function onInputEnd() {
      finish(new BootstrapError('Input closed before the password was received.'))
    }

    try {
      if (input.destroyed || input.readableEnded) {
        finish(new BootstrapError('Input closed before the password was received.'))
        return
      }

      emitKeypressEvents(input)
      input.on('keypress', onKeypress)
      input.on('error', onInputError)
      input.on('end', onInputEnd)
      input.setRawMode(true)
      input.resume()
      process.stdout.write(prompt)
    } catch (error) {
      finish(error)
    }
  })
}

async function collectCredentials(terminal) {
  let name
  let email
  try {
    name = await askLine(terminal, 'Admin name: ')
    email = await askLine(terminal, 'Admin email: ')
  } finally {
    terminal.close()
  }

  const password = await readHidden('Admin password (input hidden): ')
  const confirmation = await readHidden('Confirm password (input hidden): ')
  return validateCredentials(name, email, password, confirmation)
}

async function askLine(terminal, prompt) {
  if (terminal.closed || process.stdin.destroyed || process.stdin.readableEnded) {
    throw new BootstrapError('Input closed before the response was received.')
  }

  const controller = new AbortController()
  const onClose = () => controller.abort()
  terminal.once('close', onClose)

  try {
    if (terminal.closed) {
      throw new BootstrapError('Input closed before the response was received.')
    }

    const answer = await terminal.question(prompt, { signal: controller.signal })
    if (
      typeof answer !== 'string' ||
      terminal.closed ||
      process.stdin.destroyed ||
      process.stdin.readableEnded
    ) {
      throw new BootstrapError('Input closed before the response was received.')
    }
    return answer
  } catch (error) {
    if (controller.signal.aborted || terminal.closed) {
      throw new BootstrapError('Input closed before the response was received.')
    }
    throw error
  } finally {
    terminal.removeListener('close', onClose)
  }
}

async function confirmDatabase(target, terminal) {
  console.log(`Database target: ${target.host}/${target.databaseName}`)
  console.log('The database name alone does not verify the server identity; confirm this host is the intended main server.')
  const confirmation = await askLine(terminal, 'Type libread to authorize the bootstrap: ')
  if (confirmation !== DATABASE_NAME) {
    throw new BootstrapError('Database confirmation did not match; no database changes were made.')
  }
}

async function createFirstAdmin(credentials) {
  await prisma.$transaction(async (transaction) => {
    const lockRows = await transaction.$queryRaw`
      SELECT GET_LOCK(${ADMIN_LOCK_NAME}, 0) AS acquired
    `
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new BootstrapError('Another first-Admin bootstrap is active; no account was created.')
    }

    const existingAdmin = await transaction.user.findFirst({
      where: { role: 'Admin' },
      select: { userId: true },
    })
    if (existingAdmin) {
      throw new BootstrapError('An Admin already exists; no account was created.')
    }

    const passwordHash = await hash(credentials.password, 12)
    await transaction.user.create({
      data: {
        name: credentials.name,
        email: credentials.email,
        password: passwordHash,
        role: 'Admin',
      },
    })
  }, { maxWait: 10_000, timeout: 30_000 })
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new BootstrapError('Run this command directly in an interactive terminal.')
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new BootstrapError('DATABASE_URL is required.')
  }

  const target = getDatabaseTarget(connectionString)
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  let credentials
  try {
    await confirmDatabase(target, terminal)
    credentials = await collectCredentials(terminal)
  } finally {
    terminal.close()
  }

  await createFirstAdmin(credentials)
  console.log('The first Admin account was created successfully.')
}

try {
  await main()
} catch (error) {
  if (error instanceof BootstrapError) {
    console.error(error.message)
  } else {
    console.error('Admin bootstrap failed. Sensitive connection and credential details were not displayed.')
  }
  process.exitCode = 1
} finally {
  try {
    // The advisory lock remains held through transaction commit and is released when Prisma closes its pool.
    await prisma.$disconnect()
  } catch {
    console.error('Database shutdown could not be confirmed. The Admin account may already have been created; verify the Admin record in the main libread database before rerunning the bootstrap.')
    process.exit(1)
  }
}
