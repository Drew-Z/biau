/** One deadline covers connection, response body and decoding; never retries. */
export async function withPublicAssistantDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal | null,
): Promise<T> {
  const controller = new AbortController()
  let rejectDeadline: (reason: DOMException) => void = () => undefined
  const interrupted = new Promise<never>((_, reject) => { rejectDeadline = reject })
  const interrupt = (reason: DOMException) => {
    if (controller.signal.aborted) return
    controller.abort(reason)
    rejectDeadline(reason)
  }
  const onAbort = () => interrupt(new DOMException('Aborted', 'AbortError'))
  signal?.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => interrupt(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
  if (signal?.aborted) onAbort()
  try {
    return await Promise.race([
      interrupted,
      Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return operation(controller.signal)
      }),
    ])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
