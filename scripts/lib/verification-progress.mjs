function formatDuration(durationMs) {
  return `${Math.max(0, Math.round(durationMs))}ms`
}

export function createVerificationProgress(commandName, writer = console.log) {
  const completed = []
  let current = null

  function start(group, context = '') {
    if (current) finish(false)
    current = { group, context, startedAt: Date.now() }
    writer(`[${commandName}] START ${group}${context ? ` ${context}` : ''}`)
    return current
  }

  function setContext(context) {
    if (current) current.context = context
  }

  function finish(ok = true) {
    if (!current) return null
    const entry = { ...current, ok, durationMs: Date.now() - current.startedAt }
    completed.push(entry)
    writer(
      `[${commandName}] ${ok ? 'PASS ' : 'FAIL '} ${entry.group}${entry.context ? ` ${entry.context}` : ''} ${formatDuration(entry.durationMs)}`,
    )
    current = null
    return entry
  }

  async function run(group, context, operation) {
    start(group, context)
    try {
      const result = await operation()
      finish(true)
      return result
    } catch (error) {
      finish(false)
      throw error
    }
  }

  function currentLabel() {
    if (!current) return 'no active verification group'
    return `${current.group}${current.context ? ` ${current.context}` : ''}`
  }

  function printSummary() {
    const totalMs = completed.reduce((sum, entry) => sum + entry.durationMs, 0)
    const failed = completed.filter((entry) => !entry.ok).length
    writer(`[${commandName}] SUMMARY groups=${completed.length} failed=${failed} total=${formatDuration(totalMs)}`)
  }

  return { start, setContext, finish, run, currentLabel, printSummary }
}
