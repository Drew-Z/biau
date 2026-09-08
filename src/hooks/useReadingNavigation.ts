import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

interface CatalogPosition {
  href: string
  contentId: string
  targetKind: 'entry' | 'card'
  top: number
  width: number
  height: number
}

interface ReadingNavigationState {
  readingNavigation: { originKey: string | null; returning: boolean }
}

const maxReadingEntries = 40
const catalogPositions = new Map<string, CatalogPosition>()
const detailPositions = new Map<string, number>()
let pendingCatalogReturn: string | null = null

function remember<T>(positions: Map<string, T>, key: string, position: T) {
  positions.delete(key)
  positions.set(key, position)
  if (positions.size > maxReadingEntries) {
    const oldest = positions.keys().next().value
    if (oldest !== undefined) positions.delete(oldest)
  }
}

function navigationState(originKey: string | null, returning = false): ReadingNavigationState {
  return { readingNavigation: { originKey, returning } }
}

function readNavigationState(state: unknown) {
  if (!state || typeof state !== 'object' || !('readingNavigation' in state)) return navigationState(null).readingNavigation
  const value = state.readingNavigation
  if (!value || typeof value !== 'object') return navigationState(null).readingNavigation
  return {
    originKey: 'originKey' in value && typeof value.originKey === 'string' ? value.originKey : null,
    returning: 'returning' in value && value.returning === true,
  }
}

function findEntry(contentId: string, targetKind: CatalogPosition['targetKind']) {
  return document.querySelector<HTMLElement>(`[data-reading-${targetKind}="${CSS.escape(contentId)}"]`)
}

function documentLayoutTop(target: HTMLElement) {
  let top = 0
  let element: HTMLElement | null = target
  while (element) {
    const parent: Element | null = element.offsetParent
    top += element.offsetTop + (parent?.clientTop ?? 0)
    element = parent instanceof HTMLElement ? parent : null
  }
  return top
}

function focusTarget(target: HTMLElement | null) {
  if (!target) return
  if (!target.hasAttribute('tabindex') && !target.matches('button, a[href], input, select, textarea')) target.tabIndex = -1
  target.focus({ preventScroll: true })
}

function focusPageHeading() {
  window.scrollTo({ top: 0, behavior: 'instant' })
  focusTarget(document.querySelector<HTMLElement>('[data-reading-heading]'))
}

function keepEntryVisible(target: HTMLElement) {
  const navigation = document.querySelector('.navigation-top')?.getBoundingClientRect()
  const tabbar = document.querySelector('.mobile-tabbar')?.getBoundingClientRect()
  const topBoundary = Math.max(0, navigation?.bottom ?? 0)
  const bottomBoundary = tabbar && tabbar.height > 0 ? Math.min(window.innerHeight, tabbar.top) : window.innerHeight
  const top = documentLayoutTop(target) - window.scrollY
  if (top < topBoundary || top + target.offsetHeight > bottomBoundary) {
    const centeredTop = topBoundary + Math.max(0, (bottomBoundary - topBoundary - target.offsetHeight) / 2)
    window.scrollTo({ top: documentLayoutTop(target) - centeredTop, behavior: 'instant' })
  }
}

function onReadingInteraction(listener: () => void) {
  const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
  for (const event of events) window.addEventListener(event, listener, { capture: true, passive: true })
  return () => {
    for (const event of events) window.removeEventListener(event, listener, true)
  }
}

function findHashTarget(hash: string) {
  if (!hash) return null
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null
  }
}

export function useCatalogReadingNavigation(href: string) {
  const { key, hash, state } = useLocation()
  const navigationType = useNavigationType()
  const { originKey, returning } = readNavigationState(state)
  const transition = useRef<{ key: string; fromDetail: boolean } | null>(null)

  useLayoutEffect(() => {
    if (transition.current?.key !== key) {
      transition.current = { key, fromDetail: pendingCatalogReturn === href }
      pendingCatalogReturn = null
    }
    const shouldRestore = navigationType === 'POP' ? transition.current.fromDetail : returning
    const saved = (navigationType === 'POP' ? catalogPositions.get(key) : undefined)
      ?? (originKey ? catalogPositions.get(originKey) : undefined)
    if (hash || !shouldRestore) return

    let cancelled = false
    const stopListening = onReadingInteraction(() => { cancelled = true })
    const frame = requestAnimationFrame(() => {
      stopListening()
      if (cancelled) return
      const target = saved?.href === href ? findEntry(saved.contentId, saved.targetKind) : null
      if (saved && target && target.getClientRects().length > 0) {
        if (saved.width === window.innerWidth && saved.height === window.innerHeight) {
          // Entrance transforms are transient; restoring their translated rect
          // would leave the entry displaced after its animation finishes.
          window.scrollTo({ top: documentLayoutTop(target) - saved.top, behavior: 'instant' })
        } else {
          target.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
        keepEntryVisible(target)
        focusTarget(target)
        remember(catalogPositions, key, saved)
      } else {
        focusPageHeading()
      }
    })
    return () => {
      cancelAnimationFrame(frame)
      stopListening()
    }
  }, [hash, href, key, navigationType, originKey, returning])

  return (contentId: string, sourceHref = href) => {
    const card = findEntry(contentId, 'card')
    const targetKind = document.activeElement === card ? 'card' : 'entry'
    const target = targetKind === 'card' ? card : findEntry(contentId, 'entry')
    if (!target) return navigationState(null)
    remember(catalogPositions, key, {
      href: sourceHref,
      contentId,
      targetKind,
      top: documentLayoutTop(target) - window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
    })
    return navigationState(key)
  }
}

export function useDetailReadingNavigation(listHref: string, ready = true) {
  const { key, pathname, search, hash, state } = useLocation()
  const navigationType = useNavigationType()
  const interrupted = useRef(false)
  const { originKey } = readNavigationState(state)
  const validOrigin = originKey && catalogPositions.get(originKey)?.href === listHref ? originKey : null

  // Only a direct detail-to-catalog transition may restore a reading entry.
  // Returning later from Status or another route leaves native history alone.
  useLayoutEffect(() => () => {
    pendingCatalogReturn = `${window.location.pathname}${window.location.search}` === listHref ? listHref : null
  }, [key, listHref])

  // Keep this listener active while an asynchronous article is still loading.
  useLayoutEffect(() => {
    interrupted.current = false
    return onReadingInteraction(() => { interrupted.current = true })
  }, [key])

  useLayoutEffect(() => {
    if (!ready) return
    const savedY = detailPositions.get(key)
    const routeHref = `${pathname}${search}${hash}`
    let positioned = false
    let frame = 0
    const needsStableLayout = (navigationType === 'POP' && savedY !== undefined) || Boolean(findHashTarget(hash))
    const images = needsStableLayout
      ? [...document.querySelectorAll<HTMLImageElement>('.detail-page img[loading="eager"]')]
      : []
    const savePosition = () => {
      // A scroll event queued by the old document must not overwrite its record
      // after Router has already changed the browser address.
      if ((positioned || interrupted.current) && `${window.location.pathname}${window.location.search}${window.location.hash}` === routeHref) {
        remember(detailPositions, key, window.scrollY)
      }
    }
    const position = () => {
      if (!interrupted.current) {
        const hashTarget = findHashTarget(hash)
        if (navigationType === 'POP' && savedY !== undefined) {
          window.scrollTo({ top: savedY, behavior: 'instant' })
        } else if (hashTarget) {
          hashTarget.scrollIntoView({ block: 'start', behavior: 'instant' })
          focusTarget(hashTarget)
        } else if (navigationType !== 'POP') {
          focusPageHeading()
        }
      }
      positioned = true
      savePosition()
    }
    const positionWhenReady = () => {
      if (positioned || images.some((image) => !image.complete)) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(position)
    }
    // A late hero image changes the document height after route commit. Restore
    // history/fragments after its load/error, without delaying fresh title focus.
    for (const image of images) {
      image.addEventListener('load', positionWhenReady)
      image.addEventListener('error', positionWhenReady)
    }
    positionWhenReady()
    window.addEventListener('scroll', savePosition, { passive: true })
    window.addEventListener('click', savePosition, true)
    window.addEventListener('keydown', savePosition, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', savePosition)
      window.removeEventListener('click', savePosition, true)
      window.removeEventListener('keydown', savePosition, true)
      for (const image of images) {
        image.removeEventListener('load', positionWhenReady)
        image.removeEventListener('error', positionWhenReady)
      }
    }
  }, [hash, key, navigationType, pathname, ready, search])

  return {
    relatedState: navigationState(validOrigin),
    returnState: navigationState(validOrigin, true),
  }
}
