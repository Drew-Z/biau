import { useCallback, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  applyHarborScene,
  getNextHarborScene,
  HARBOR_SCENE_STORAGE_KEY,
  readStoredHarborScene,
} from '../utils/appearance'

export function useHarborScene() {
  const [scene, setScene] = useState(readStoredHarborScene)

  useLayoutEffect(() => {
    applyHarborScene(document.documentElement, scene)
    try {
      window.localStorage.setItem(HARBOR_SCENE_STORAGE_KEY, scene)
    } catch {
      // The visual state still works when storage is unavailable.
    }
  }, [scene])

  const cycleScene = useCallback(() => {
    const commit = () => {
      flushSync(() => setScene((current) => getNextHarborScene(current)))
    }
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown
    }
    if (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      typeof transitionDocument.startViewTransition === 'function'
    ) {
      transitionDocument.startViewTransition(commit)
      return
    }
    commit()
  }, [])

  return { scene, cycleScene }
}
