export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function assertEqual<T>(actual: T, expected: T, label: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, label: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, received ${actualJson}`)
  }
}

export async function expectFailure(
  action: () => unknown | Promise<unknown>,
  expected: string,
  label: string,
) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Error && error.message.includes(expected)) return
    throw new Error(`${label}: expected ${expected}, received ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  }
  throw new Error(`${label}: expected failure containing ${expected}`)
}
