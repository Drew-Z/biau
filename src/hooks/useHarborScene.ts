import { useLayoutEffect } from 'react'
import { applyHarborScene, STELLAR_SCENE } from '../utils/appearance'

export function useHarborScene() {
  useLayoutEffect(() => {
    applyHarborScene(document.documentElement)
  }, [])
  return { scene: STELLAR_SCENE }
}
