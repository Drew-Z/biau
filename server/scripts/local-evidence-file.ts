import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export async function resolveRepositoryPath(options: Map<string, string>, name: string, fallback: string) {
  const path = resolve(repositoryRoot, options.get(name) ?? fallback)
  const repoRelativePath = relative(repositoryRoot, path)
  if (repoRelativePath.startsWith('..') || isAbsolute(repoRelativePath)) throw new Error(`path-outside-repository:${name}`)
  await assertRealPathInsideRepository(path, name)
  return path
}

export async function readJsonFile(path: string) {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch (error) {
    throw new Error(`read-json-failed:${displayRepositoryPath(path)}`, { cause: error })
  }
}

export async function writeJsonFile(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export function assertLocalOutput(path: string, errorCode: string) {
  if (!basename(path).includes('.local.')) throw new Error(errorCode)
}

export function displayRepositoryPath(path: string) {
  return relative(repositoryRoot, path).replaceAll('\\', '/') || '.'
}

async function assertRealPathInsideRepository(path: string, label: string) {
  let current = path
  const repositoryRealPath = await realpath(repositoryRoot)
  while (true) {
    try {
      const currentRealPath = await realpath(current)
      const realRelativePath = relative(repositoryRealPath, currentRealPath)
      if (realRelativePath.startsWith('..') || isAbsolute(realRelativePath)) throw new Error(`path-outside-repository:${label}`)
      return
    } catch (error) {
      if (!isMissingPathError(error)) throw error
      const parent = dirname(current)
      if (parent === current) throw new Error(`path-outside-repository:${label}`, { cause: error })
      current = parent
    }
  }
}

function isMissingPathError(error: unknown) {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}
