import type { PublicAssistantImageAttachment } from './publicAssistantApi'

export const PUBLIC_ASSISTANT_IMAGE_MAX_BYTES = 256_000
const PUBLIC_ASSISTANT_IMAGE_SOURCE_MAX_BYTES = 8_000_000
const PUBLIC_ASSISTANT_IMAGE_MAX_EDGE = 1_280
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class PublicAssistantImageError extends Error {
  readonly code: 'unsupported' | 'source-too-large' | 'decode-failed' | 'output-too-large'

  constructor(code: PublicAssistantImageError['code']) {
    super(code)
    this.name = 'PublicAssistantImageError'
    this.code = code
  }
}

export async function preparePublicAssistantImage(file: File): Promise<PublicAssistantImageAttachment> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new PublicAssistantImageError('unsupported')
  if (file.size <= 0 || file.size > PUBLIC_ASSISTANT_IMAGE_SOURCE_MAX_BYTES) {
    throw new PublicAssistantImageError('source-too-large')
  }
  const source = await decodeImage(file)
  try {
    for (const attempt of imageEncodingAttempts()) {
      const dimensions = fitImage(source.width, source.height, attempt.scale)
      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new PublicAssistantImageError('decode-failed')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(source.image, 0, 0, canvas.width, canvas.height)
      const blob = await canvasToBlob(canvas, attempt.mimeType, attempt.quality)
      const mimeType = blob ? readEncodedMimeType(blob.type) : null
      if (blob && mimeType && blob.size > 0 && blob.size <= PUBLIC_ASSISTANT_IMAGE_MAX_BYTES) {
        return {
          kind: 'image',
          name: normalizeFileName(file.name),
          mimeType,
          dataUrl: await blobToDataUrl(blob),
        }
      }
    }
  } finally {
    source.close()
  }
  throw new PublicAssistantImageError('output-too-large')
}

function imageEncodingAttempts() {
  return [
    { scale: 1, quality: 0.84, mimeType: 'image/webp' as const },
    { scale: 1, quality: 0.7, mimeType: 'image/webp' as const },
    { scale: 0.82, quality: 0.76, mimeType: 'image/webp' as const },
    { scale: 0.68, quality: 0.7, mimeType: 'image/webp' as const },
    { scale: 0.56, quality: 0.68, mimeType: 'image/jpeg' as const },
  ]
}

function fitImage(width: number, height: number, scale: number) {
  const baseScale = Math.min(1, PUBLIC_ASSISTANT_IMAGE_MAX_EDGE / Math.max(width, height))
  const boundedScale = baseScale * scale
  return {
    width: Math.max(1, Math.round(width * boundedScale)),
    height: Math.max(1, Math.round(height * boundedScale)),
  }
}

async function decodeImage(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Fall through to the broadly supported HTMLImageElement decoder.
    }
  }
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new PublicAssistantImageError('decode-failed'))
      element.src = objectUrl
    })
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: 'image/webp' | 'image/jpeg', quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality))
}

function readEncodedMimeType(value: string): PublicAssistantImageAttachment['mimeType'] | null {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp' ? value : null
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new PublicAssistantImageError('decode-failed'))
    reader.onerror = () => reject(new PublicAssistantImageError('decode-failed'))
    reader.readAsDataURL(blob)
  })
}

function normalizeFileName(value: string) {
  return value
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0)
      return character === '\\' || character === '/' || code < 0x20 || code === 0x7f ? ' ' : character
    })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 80) || 'image'
}
