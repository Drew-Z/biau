export async function readBoundedTextBody(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
  cancelReason = 'bounded-body-too-large',
) {
  if (!body) return { ok: true as const, text: '' }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytesRead += value.byteLength
    if (bytesRead > maximumBytes) {
      await reader.cancel(cancelReason).catch(() => undefined)
      return { ok: false as const }
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true as const, text: new TextDecoder().decode(merged) }
}
