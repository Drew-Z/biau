import { useCallback, useLayoutEffect, useState } from 'react'
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
    setScene((current) => getNextHarborScene(current))
  }, [])

  return { scene, cycleScene }
}
