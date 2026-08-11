import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const RELIABILITY_TEMP_PREFIX = 'biau-reliability-'

function isInside(parentPath, candidatePath) {
  const relativePath = relative(resolve(parentPath), resolve(candidatePath))
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function isReliabilityTempPath(candidatePath) {
  const tempRoot = resolve(tmpdir())
  if (!isInside(tempRoot, candidatePath)) return false
  const relativePath = relative(tempRoot, resolve(candidatePath))
  const firstSegment = relativePath.split(/[\\/]/u)[0] ?? ''
  return firstSegment.startsWith(RELIABILITY_TEMP_PREFIX)
}

function readWriteStatusValue(argv) {
  let found = false
  let value = ''

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--write-status') {
      if (found) throw new Error('duplicate --write-status option')
      found = true
      const next = argv[index + 1] ?? ''
      if (next && !next.startsWith('--')) value = next
      continue
    }
    if (item.startsWith('--write-status=')) {
      if (found) throw new Error('duplicate --write-status option')
      found = true
      value = item.slice('--write-status='.length)
    }
  }

  return { found, value }
}

export function resolveStatusOutput(argv, options) {
  const { repoRoot, defaultRelativePath, allowReliabilityTemp = false } = options
  const parsed = readWriteStatusValue(argv)
  if (!parsed.found) return { enabled: false, filePath: '', displayPath: '', temporary: false }

  const requestedPath = parsed.value || defaultRelativePath
  if (!requestedPath) throw new Error('--write-status requires a default or explicit path')

  const filePath = isAbsolute(requestedPath) ? resolve(requestedPath) : resolve(repoRoot, requestedPath)
  const publicStatusRoot = resolve(repoRoot, 'public/status')
  const allowed = isInside(publicStatusRoot, filePath) || (allowReliabilityTemp && isReliabilityTempPath(filePath))
  if (!allowed) throw new Error('--write-status path must stay inside public/status or a controlled reliability temp directory')

  const displayPath = isInside(repoRoot, filePath)
    ? relative(repoRoot, filePath).replace(/\\/gu, '/')
    : `[temporary]/${relative(resolve(tmpdir()), filePath).replace(/\\/gu, '/')}`
  return { enabled: true, filePath, displayPath, temporary: isReliabilityTempPath(filePath) }
}

export function resolveStatusInputDirectory(value, options) {
  const { repoRoot } = options
  if (!value) return resolve(repoRoot, 'public/status')
  const directoryPath = resolve(value)
  if (!isReliabilityTempPath(directoryPath)) {
    throw new Error('--status-input-dir must be a controlled reliability temp directory')
  }
  return directoryPath
}

export async function writeJsonAtomically(filePath, payload) {
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, filePath)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }
}

export function reliabilityTempPrefix() {
  return RELIABILITY_TEMP_PREFIX
}
