import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/auth'
import {
  MAX_PDF_FILE_SIZE,
  removeStoredPdf,
  storePdf,
} from '@/lib/pdf-storage'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_MULTIPART_OVERHEAD = 64 * 1024
const MAX_REQUEST_SIZE = MAX_PDF_FILE_SIZE + MAX_MULTIPART_OVERHEAD

class RequestTooLargeError extends Error {}

async function readUploadForm(request: NextRequest): Promise<FormData> {
  const contentType = request.headers.get('content-type')
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) {
    throw new Error('Invalid upload request.')
  }

  const contentLengthHeader = request.headers.get('content-length')
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader)
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new Error('Invalid upload request.')
    }
    if (contentLength > MAX_REQUEST_SIZE) {
      throw new RequestTooLargeError()
    }
  }

  if (!request.body) {
    throw new Error('Invalid upload request.')
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalSize = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    totalSize += value.byteLength
    if (totalSize > MAX_REQUEST_SIZE) {
      await reader.cancel()
      throw new RequestTooLargeError()
    }
    chunks.push(value)
  }

  const body = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new Response(body, {
    headers: { 'content-type': contentType },
  }).formData()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId: bookIdParam } = await params

  if (!/^\d+$/.test(bookIdParam)) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

  const bookId = Number(bookIdParam)
  if (!Number.isSafeInteger(bookId) || bookId < 1) {
    return NextResponse.json({ error: 'A valid book ID is required.' }, { status: 400 })
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId: session.userId },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    }
    if (user.role !== 'Admin') {
      return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 })
    }

    const book = await prisma.book.findUnique({
      where: { bookId },
      select: { bookId: true },
    })
    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }
  } catch {
    return NextResponse.json(
      { error: 'Unable to upload the PDF. Please try again later.' },
      { status: 500 },
    )
  }

  let formData: FormData
  try {
    formData = await readUploadForm(request)
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return NextResponse.json({ error: 'The uploaded file is too large.' }, { status: 413 })
    }
    return NextResponse.json({ error: 'A valid PDF upload is required.' }, { status: 400 })
  }

  const formEntries = Array.from(formData.entries())
  if (formEntries.length !== 1 || formEntries[0][0] !== 'file') {
    return NextResponse.json({ error: 'A single PDF file is required.' }, { status: 400 })
  }

  const upload = formEntries[0][1]
  if (typeof upload === 'string' || upload.size === 0) {
    return NextResponse.json({ error: 'A valid PDF file is required.' }, { status: 400 })
  }

  if (upload.size > MAX_PDF_FILE_SIZE) {
    return NextResponse.json({ error: 'The uploaded file is too large.' }, { status: 413 })
  }

  let contents: Uint8Array
  try {
    contents = new Uint8Array(await upload.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'A valid PDF file is required.' }, { status: 400 })
  }

  if (
    contents.byteLength < 5 ||
    Buffer.from(contents.subarray(0, 5)).toString('ascii') !== '%PDF-'
  ) {
    return NextResponse.json({ error: 'A valid PDF file is required.' }, { status: 400 })
  }

  let storageKey: string
  try {
    storageKey = await storePdf(contents)
  } catch {
    return NextResponse.json(
      { error: 'Unable to store the PDF. Please try again later.' },
      { status: 500 },
    )
  }

  try {
    await prisma.book.update({
      where: { bookId },
      data: { pdfFilePath: storageKey },
      select: { bookId: true },
    })
  } catch {
    try {
      await removeStoredPdf(storageKey)
    } catch {
      console.error('Failed to clean up an unassociated PDF upload.')
    }

    return NextResponse.json(
      { error: 'Unable to upload the PDF. Please try again later.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ message: 'PDF uploaded successfully.' }, { status: 200 })
}
