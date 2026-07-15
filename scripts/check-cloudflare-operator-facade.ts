import { onRequest } from '../functions/api/operator/[[path]].js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const encoder = new TextEncoder()
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify'],
)
const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
Object.assign(publicJwk, { kid: 'operator-test-key', alg: 'RS256', use: 'sig' })

const teamOrigin = 'https://team.example.invalid'
const audience = 'operator-access-audience'
const ownerEmail = 'owner@example.invalid'
const serviceToken = 'operator-service-placeholder'
const upstreamRequests: Array<{ url: string; headers: Headers }> = []
const originalFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (url === `${teamOrigin}/cdn-cgi/access/certs`) {
    return Response.json({ keys: [publicJwk] })
  }

  upstreamRequests.push({ url, headers: new Headers(init?.headers) })
  return Response.json({ ok: true, source: 'operator-upstream' })
}

try {
  const missingIdentity = await onRequest(createContext(new Request('https://biau.example.invalid/api/operator/me')))
  assert(missingIdentity.status === 401, 'facade must reject requests without a Cloudflare Access assertion')

  const deniedIdentity = await onRequest(
    createContext(
      new Request('https://biau.example.invalid/api/operator/me', {
        headers: { 'Cf-Access-Jwt-Assertion': await signAccessJwt('other@example.invalid') },
      }),
    ),
  )
  assert(deniedIdentity.status === 403, 'facade must enforce the owner email allow-list')

  const accepted = await onRequest(
    createContext(
      new Request('https://biau.example.invalid/api/operator/me?view=compact', {
        headers: {
          'Cf-Access-Jwt-Assertion': await signAccessJwt(ownerEmail),
          Authorization: 'Bearer browser-controlled-value',
          'X-Biau-Operator-Id': 'spoofed-browser-owner',
        },
      }),
    ),
  )
  assert(accepted.status === 200, 'facade should proxy a valid owner request')
  assert(upstreamRequests.length === 1, 'only the accepted owner request should reach the Operator API')

  const upstream = upstreamRequests[0]
  assert(upstream.url === 'https://operator.example.invalid/operator/me?view=compact', 'facade target path should stay scoped to /operator')
  assert(upstream.headers.get('Authorization') === `Bearer ${serviceToken}`, 'facade must inject its server-held service token')
  assert(upstream.headers.get('X-Biau-Operator-Id') === 'site-owner', 'facade must replace browser-supplied owner identity')
  assert(upstream.headers.get('X-Biau-Operator-Email') === ownerEmail, 'facade must forward the verified Access email')
  assert(!JSON.stringify(await accepted.json()).includes(serviceToken), 'facade responses must not expose the service token')

  console.log('Cloudflare Operator facade smoke passed')
} finally {
  globalThis.fetch = originalFetch
}

function createContext(request: Request) {
  return {
    request,
    env: {
      OPERATOR_API_BASE_URL: 'https://operator.example.invalid',
      OPERATOR_SERVICE_TOKEN: serviceToken,
      OPERATOR_OWNER_ID: 'site-owner',
      OPERATOR_DISPLAY_NAME: 'Site Owner',
      OPERATOR_OWNER_EMAILS: ownerEmail,
      CF_ACCESS_TEAM_DOMAIN: teamOrigin,
      CF_ACCESS_AUD: audience,
    },
    params: { path: 'me' },
  }
}

async function signAccessJwt(email: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = encodeJson({ alg: 'RS256', kid: 'operator-test-key', typ: 'JWT' })
  const payload = encodeJson({
    aud: [audience],
    email,
    exp: now + 300,
    iat: now - 5,
    iss: teamOrigin,
    sub: `access-user:${email}`,
  })
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, encoder.encode(`${header}.${payload}`))
  return `${header}.${payload}.${encodeBytes(new Uint8Array(signature))}`
}

function encodeJson(value: unknown) {
  return encodeBytes(encoder.encode(JSON.stringify(value)))
}

function encodeBytes(value: Uint8Array) {
  return Buffer.from(value).toString('base64url')
}
