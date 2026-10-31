import { NextRequest, NextResponse } from 'next/server'
import {
  InvalidPdfStorageKeyError,
  openStoredPdf,
  StoredPdfNotFoundError,
} from '@/lib/pdf-storage'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const STREAM_CHUNK_SIZE = 64 * 1024

type ByteRange = { start: number; end: number }

function parseByteRange(header: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim())
  if (!match || (!match[1] && !match[2])) return null

  const startValue = match[1] ? Number(match[1]) : null
  const endValue = match[2] ? Number(match[2]) : null
  if (
    (startValue !== null && !Number.isSafeInteger(startValue)) ||
    (endValue !== null && !Number.isSafeInteger(endValue))
  ) {
    return null
  }

  if (startValue === null) {
    if (endValue === null || endValue <= 0) return null
    return { start: Math.max(size - endValue, 0), end: size - 1 }
  }

  if (startValue >= size || (endValue !== null && endValue < startValue)) return null
  return { start: startValue, end: Math.min(endValue ?? size - 1, size - 1) }
}

function createFileStream(
  file: Awaited<ReturnType<typeof openStoredPdf>>['file'],
  start: number,
  length: number,
): ReadableStream<Uint8Array> {
  let position = start
  let remaining = length
  let closed = false

  async function closeFile() {
    if (!closed) {
      closed = true
      await file.close()
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (remaining === 0) {
        await closeFile()
        controller.close()
        return
      }

      const buffer = Buffer.allocUnsafe(Math.min(STREAM_CHUNK_SIZE, remaining))
      try {
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position)
        if (bytesRead === 0) {
          await closeFile()
          controller.error(new Error('PDF stream ended unexpectedly.'))
          return
        }

        position += bytesRead
        remaining -= bytesRead
        controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead))

        if (remaining === 0) {
          await closeFile()
          controller.close()
        }
      } catch {
        await closeFile()
        console.error('Failed while streaming book PDF.')
        controller.error(new Error('Unable to stream PDF.'))
      }
    },
    async cancel() {
      await closeFile()
    },
  })
}

function invalidRangeResponse(size: number): NextResponse {
  return new NextResponse(null, {
    status: 416,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes */${size}`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function GET(
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

  try {
    const book = await prisma.book.findFirst({
      where: { bookId, status: 'Published' },
      select: { pdfFilePath: true },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }

    const { file, size } = await openStoredPdf(book.pdfFilePath)
    const rangeHeader = request.headers.get('range')
    const range = rangeHeader && !request.headers.has('if-range')
      ? parseByteRange(rangeHeader, size)
      : null

    if (rangeHeader && !request.headers.has('if-range') && !range) {
      await file.close()
      return invalidRangeResponse(size)
    }

    const start = range?.start ?? 0
    const end = range?.end ?? size - 1
    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline; filename="book.pdf"',
      'Content-Length': String(end - start + 1),
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    })

    if (range) {
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
    }

    return new NextResponse(createFileStream(file, start, end - start + 1), {
      status: range ? 206 : 200,
      headers,
    })
  } catch (error) {
    if (error instanceof InvalidPdfStorageKeyError || error instanceof StoredPdfNotFoundError) {
      return NextResponse.json({ error: 'Book PDF not found.' }, { status: 404 })
    }

    console.error('Failed to read book PDF.')
    return NextResponse.json(
      { error: 'Unable to read the book PDF. Please try again later.' },
      { status: 500 },
    )
  }
}
