function isLoopbackHostname(hostname) {
  const normalized = hostname.replace(/^\[|\]$/gu, '').toLowerCase()
  return normalized === 'localhost' || normalized === '::1' || normalized.startsWith('127.')
}

function isAllowedRequestUrl(value, allowedOrigin, allowLoopback) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol === 'data:' || url.protocol === 'blob:') return true
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true
  return url.origin === allowedOrigin || (allowLoopback && isLoopbackHostname(url.hostname))
}

export async function installLocalNetworkGuard(page, baseUrl, onBlocked, { allowLoopback = true } = {}) {
  const allowedOrigin = new URL(baseUrl).origin
  const blockedUrls = new Set()

  await page.route('**/*', async (route) => {
    const request = route.request()
    if (isAllowedRequestUrl(request.url(), allowedOrigin, allowLoopback)) {
      await route.fallback()
      return
    }

    blockedUrls.add(request.url())
    onBlocked?.({ resourceType: request.resourceType() })
    await route.abort('blockedbyclient')
  })

  return {
    wasBlocked: (url) => blockedUrls.has(url),
  }
}
