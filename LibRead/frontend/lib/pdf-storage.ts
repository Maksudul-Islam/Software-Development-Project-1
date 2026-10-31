import 'server-only'

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { lstat, mkdir, open, realpath, rm } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export const MAX_PDF_FILE_SIZE = 25 * 1024 * 1024

const PDF_SIGNATURE = Buffer.from('%PDF-')
const STORAGE_KEY_PATTERN = /^books\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/

export class InvalidPdfStorageKeyError extends Error {}
export class StoredPdfNotFoundError extends Error {}

function findProjectRoot(): string {
  const workingDirectory = path.resolve(process.cwd())
  let directory = workingDirectory

  while (true) {
    if (existsSync(path.join(directory, '.git'))) {
      return directory
    }

    const parent = path.dirname(directory)
    if (parent === directory) {
      return workingDirectory
    }
    directory = parent
  }
}

function isSameOrNestedPath(parent: string, candidate: string): boolean {
  const relativePath = path.relative(parent, candidate)
  return (
    relativePath === '' ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`))
  )
}

function getConfiguredRoot(): string {
  const configuredRoot = process.env.LIBREAD_PDF_STORAGE_DIR?.trim()

  if (configuredRoot && !path.isAbsolute(configuredRoot)) {
    throw new Error('PDF storage directory must be an absolute path.')
  }

  const storageRoot = configuredRoot
    ? path.resolve(configuredRoot)
    : path.join(homedir(), '.libread', 'pdf-storage')

  if (isSameOrNestedPath(findProjectRoot(), storageRoot)) {
    throw new Error('PDF storage directory must be outside the project.')
  }

  return storageRoot
}

async function getBooksDirectory(): Promise<string> {
  const storageRoot = getConfiguredRoot()
  await mkdir(storageRoot, { recursive: true, mode: 0o700 })

  const [realStorageRoot, realProjectRoot] = await Promise.all([
    realpath(storageRoot),
    realpath(findProjectRoot()),
  ])

  if (isSameOrNestedPath(realProjectRoot, realStorageRoot)) {
    throw new Error('PDF storage directory must be outside the project.')
  }

  const booksDirectory = path.join(realStorageRoot, 'books')
  await mkdir(booksDirectory, { recursive: true, mode: 0o700 })
  const realBooksDirectory = await realpath(booksDirectory)

  if (!isSameOrNestedPath(realStorageRoot, realBooksDirectory)) {
    throw new Error('PDF storage directory is invalid.')
  }

  return realBooksDirectory
}

function getStoredFilePath(booksDirectory: string, storageKey: string): string {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new InvalidPdfStorageKeyError()
  }

  return path.join(booksDirectory, storageKey.slice('books/'.length))
}

export async function openStoredPdf(
  storageKey: string,
): Promise<{ file: FileHandle; size: number }> {
  const booksDirectory = await getBooksDirectory()
  const filePath = getStoredFilePath(booksDirectory, storageKey)

  try {
    const [realBooksDirectory, realFilePath, fileStats] = await Promise.all([
      realpath(booksDirectory),
      realpath(filePath),
      lstat(filePath),
    ])

    if (
      !isSameOrNestedPath(realBooksDirectory, realFilePath) ||
      fileStats.isSymbolicLink() ||
      !fileStats.isFile() ||
      fileStats.size <= 0
    ) {
      throw new StoredPdfNotFoundError()
    }

    const file = await open(filePath, 'r')
    try {
      const openedStats = await file.stat()
      if (!openedStats.isFile() || openedStats.size <= 0) {
        throw new StoredPdfNotFoundError()
      }

      return { file, size: openedStats.size }
    } catch (error) {
      await file.close()
      throw error
    }
  } catch (error) {
    if (error instanceof InvalidPdfStorageKeyError || error instanceof StoredPdfNotFoundError) {
      throw error
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new StoredPdfNotFoundError()
    }
    throw error
  }
}

export async function storePdf(contents: Uint8Array): Promise<string> {
  if (
    contents.byteLength < PDF_SIGNATURE.byteLength ||
    contents.byteLength > MAX_PDF_FILE_SIZE ||
    !Buffer.from(contents.subarray(0, PDF_SIGNATURE.byteLength)).equals(PDF_SIGNATURE)
  ) {
    throw new Error('Invalid PDF file.')
  }

  const storageKey = `books/${randomUUID()}.pdf`
  const booksDirectory = await getBooksDirectory()
  const filePath = getStoredFilePath(booksDirectory, storageKey)
  const file = await open(filePath, 'wx', 0o600)

  try {
    await file.writeFile(contents)
    await file.sync()
  } catch (error) {
    await file.close()
    await rm(filePath, { force: true })
    throw error
  }

  await file.close()
  return storageKey
}

export async function removeStoredPdf(storageKey: string): Promise<void> {
  const booksDirectory = await getBooksDirectory()
  const filePath = getStoredFilePath(booksDirectory, storageKey)
  await rm(filePath, { force: true })
}
