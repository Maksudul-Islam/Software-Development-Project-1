import { NextResponse } from 'next/server'
import {
  InvalidPdfStorageKeyError,
  openStoredPdf,
  StoredPdfNotFoundError,
} from '@/lib/pdf-storage'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const STREAM_CHUNK_SIZE = 64 * 1024

function createFileStream(
  file: Awaited<ReturnType<typeof openStoredPdf>>['file'],
  size: number,
): ReadableStream<Uint8Array> {
  let position = 0
  let closed = false

  async function closeFile() {
    if (!closed) {
      closed = true
      await file.close()
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (position >= size) {
        await closeFile()
        controller.close()
        return
      }

      const buffer = Buffer.allocUnsafe(Math.min(STREAM_CHUNK_SIZE, size - position))
      try {
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position)
        if (bytesRead === 0) {
          await closeFile()
          controller.error(new Error('PDF stream ended unexpectedly.'))
          return
        }

        position += bytesRead
        controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead))

        if (position >= size) {
          await closeFile()
          controller.close()
        }
      } catch {
        await closeFile()
        console.error('Failed while streaming book download.')
        controller.error(new Error('Unable to stream PDF.'))
      }
    },
    async cancel() {
      await closeFile()
    },
  })
}

function createDownloadFilename(title: string): string {
  const safeTitle = title
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 100)

  return `${safeTitle || 'book'}.pdf`
}

export async function GET(
  _request: Request,
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

  let file: Awaited<ReturnType<typeof openStoredPdf>>['file'] | undefined
  try {
    const book = await prisma.book.findFirst({
      where: { bookId, status: 'Published' },
      select: {
        title: true,
        isDownloadable: true,
        pdfFilePath: true,
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found.' }, { status: 404 })
    }
    if (!book.isDownloadable) {
      return NextResponse.json({ error: 'Downloading is not permitted for this book.' }, { status: 403 })
    }

    const storedPdf = await openStoredPdf(book.pdfFilePath)
    file = storedPdf.file
    const filename = createDownloadFilename(book.title)
    const stream = createFileStream(file, storedPdf.size)
    const response = new NextResponse(stream, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(storedPdf.size),
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
      },
    })
    file = undefined
    return response
  } catch (error) {
    if (file) {
      try {
        await file.close()
      } catch {
        console.error('Failed to close book PDF after a download setup error.')
      }
    }
    if (error instanceof InvalidPdfStorageKeyError || error instanceof StoredPdfNotFoundError) {
      return NextResponse.json({ error: 'Book PDF not found.' }, { status: 404 })
    }

    console.error('Failed to prepare book PDF download.')
    return NextResponse.json(
      { error: 'Unable to download the book PDF. Please try again later.' },
      { status: 500 },
    )
  }
}
