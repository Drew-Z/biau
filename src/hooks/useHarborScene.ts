import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  applyHarborScene,
  getNextHarborScene,
  HARBOR_SCENE_STORAGE_KEY,
  readStoredHarborScene,
} from '../utils/appearance'

export function useHarborScene() {
  const [scene, setScene] = useState(readStoredHarborScene)
  const sceneRef = useRef(scene)

  useLayoutEffect(() => {
    sceneRef.current = scene
    applyHarborScene(document.documentElement, scene)
    try {
      window.localStorage.setItem(HARBOR_SCENE_STORAGE_KEY, scene)
    } catch {
      // The visual state still works when storage is unavailable.
    }
  }, [scene])

  const cycleScene = useCallback(() => {
    const commit = () => {
      const nextScene = getNextHarborScene(sceneRef.current)
      sceneRef.current = nextScene
      applyHarborScene(document.documentElement, nextScene)
      try {
        window.localStorage.setItem(HARBOR_SCENE_STORAGE_KEY, nextScene)
      } catch {
        // The visual state still works when storage is unavailable.
      }
      flushSync(() => setScene(nextScene))
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
