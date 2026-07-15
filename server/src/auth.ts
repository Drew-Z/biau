import type { Request } from 'express'
import { getPrisma } from './db.js'
import { safeEqualHash, sha256 } from './crypto.js'
import { env } from './env.js'

export interface OperatorPrincipal {
  id: string
  name: string
  email: string
  role: 'OWNER'
  modelChannelId: string | null
}

export function requireDatabase() {
  const prisma = getPrisma()
  if (!prisma) {
    const error = new Error('database-not-configured')
    error.name = 'DatabaseNotConfigured'
    throw error
  }
  return prisma
}

export function requireOperator(req: Request): OperatorPrincipal {
  if (!hasOperatorAuth()) throw namedError('OperatorAuthNotConfigured', 'operator-auth-not-configured')

  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw namedError('OperatorUnauthorized', 'missing-operator-service-token')
  const token = header.slice('Bearer '.length).trim()
  if (!token || !safeEqualHash(sha256(token), sha256(env.operatorServiceToken))) {
    throw namedError('OperatorUnauthorized', 'invalid-operator-service-token')
  }

  const forwardedOwnerId = readHeader(req, 'x-biau-operator-id')
  const email = readHeader(req, 'x-biau-operator-email').toLowerCase()
  if (forwardedOwnerId !== env.operatorOwnerId || !email || !env.operatorOwnerEmails.includes(email)) {
    throw namedError('OperatorForbidden', 'operator-identity-not-allowed')
  }

  return {
    id: env.operatorOwnerId,
    name: readHeader(req, 'x-biau-operator-name').slice(0, 80) || env.operatorDisplayName,
    email,
    role: 'OWNER',
    modelChannelId: env.operatorModelChannelId,
  }
}

export function hasOperatorAuth() {
  return Boolean(env.operatorServiceToken && env.operatorOwnerId && env.operatorOwnerEmails.length > 0)
}

function readHeader(req: Request, name: string) {
  const value = req.headers[name]
  return (Array.isArray(value) ? value[0] : value ?? '').trim()
}

function namedError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}
