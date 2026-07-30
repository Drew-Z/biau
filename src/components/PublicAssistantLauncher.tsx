import { useRef } from 'react'
import { LoaderCircle, RotateCw } from 'lucide-react'
import { usePublicAssistantCollision } from '../hooks/usePublicAssistantCollision'
import { announceMobileSurfaceOpen } from '../utils/mobileSurface'
import type { PublicAssistantWarmupSnapshot } from '../utils/publicAssistantWarmup'

interface PublicAssistantLauncherProps {
  warmup: PublicAssistantWarmupSnapshot
  footerVisible: boolean
  onIntent: () => void
  onOpen: () => void
  opening?: boolean
}

export function PublicAssistantLauncher({ warmup, footerVisible, onIntent, onOpen, opening = false }: PublicAssistantLauncherProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  usePublicAssistantCollision(rootRef, opening)
  const label = opening
    ? '正在打开助手'
    : warmup.state === 'warming'
    ? '助手准备中'
    : warmup.state === 'ready'
      ? '助手已就绪'
      : warmup.state === 'error'
        ? '助手等待重试'
        : '泊岸研究助手'
  return (
    <div
      ref={rootRef}
      className={`public-assistant public-assistant-launcher ${footerVisible ? 'is-footer-visible' : ''}`}
      data-assistant-warmup={warmup.state}
      data-collision-offset="0"
    >
      <button
        type="button"
        className={`public-assistant__trigger is-${opening ? 'warming' : warmup.state}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={opening}
        disabled={opening}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        onClick={() => {
          onIntent()
          announceMobileSurfaceOpen('public-assistant')
          onOpen()
        }}
      >
        <span className="public-assistant__trigger-mark" aria-hidden="true">
          {opening || warmup.state === 'warming'
            ? <LoaderCircle className="is-spinning" size={15} />
            : warmup.state === 'error'
              ? <RotateCw size={15} />
              : 'B'}
        </span>
        <span className="public-assistant__trigger-text">{label}</span>
      </button>
    </div>
  )
}
