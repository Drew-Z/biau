import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, EyeOff, MessageCircle, MoreHorizontal, RotateCcw, X } from 'lucide-react'
import { PublicAssistantPet } from './PublicAssistantPet'
import { PublicAssistantPetBubble } from './PublicAssistantPetBubble'
import { usePublicAssistantPresence } from '../hooks/usePublicAssistantPresence'
import { usePublicAssistantCollision } from '../hooks/usePublicAssistantCollision'
import { useSiteLanguage } from '../hooks/useSiteLanguage'
import { publicAssistantPetCopy } from '../data/publicAssistantPetCopy'
import { createPublicAssistantPetActivity } from '../utils/publicAssistantPetActivity'
import { loadPublicAssistantWidget } from '../utils/publicAssistantLoader'
import { getPublicAssistantWarmupServerSnapshot, getPublicAssistantWarmupSnapshot, startPublicAssistantWarmup, subscribePublicAssistantWarmup } from '../utils/publicAssistantWarmup'
import { announceMobileSurfaceOpen } from '../utils/mobileSurface'
import { trackAnalyticsEvent } from '../utils/analytics'
import { SITE_LANGUAGE_TAGS } from '../utils/siteLanguage'

const PublicAssistantWidget = lazy(loadPublicAssistantWidget)

export function PublicAssistantCompanion({ footerVisible, restoreHost }: { footerVisible: boolean; restoreHost: HTMLElement | null }) {
  const language = useSiteLanguage()
  const copy = publicAssistantPetCopy[language]
  const [petTasks] = useState(createPublicAssistantPetActivity)
  const snapshot = useSyncExternalStore(petTasks.subscribe, petTasks.getSnapshot, petTasks.getServerSnapshot)
  const warmup = useSyncExternalStore(subscribePublicAssistantWarmup, getPublicAssistantWarmupSnapshot, getPublicAssistantWarmupServerSnapshot)
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [workspaceMounted, setWorkspaceMounted] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const characterRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionsRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  const skipFocusWarmup = useRef(false)
  const presence = usePublicAssistantPresence(triggerRef)
  const clearCollision = usePublicAssistantCollision(characterRef, isOpen, `${presence.x}:${presence.y}`)
  const activity = snapshot.summary.activity
  const completionKey = activity === 'idle' || activity === 'ready' ? snapshot.feedbackKey : null
  const description = [copy.activities[activity], snapshot.unreadCount ? copy.unread(snapshot.unreadCount) : ''].filter(Boolean).join(' · ')
  const focusPet = useCallback(() => {
    skipFocusWarmup.current = true
    triggerRef.current?.focus({ preventScroll: true })
    skipFocusWarmup.current = false
  }, [])

  useLayoutEffect(() => {
    if (isOpen || !returnFocus.current) return
    returnFocus.current = false
    focusPet()
  }, [focusPet, isOpen])

  useEffect(() => {
    if (!optionsOpen) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !characterRef.current?.contains(event.target)) setOptionsOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      setOptionsOpen(false)
      optionsRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape, true)
    }
  }, [optionsOpen])

  const prepare = () => { void loadPublicAssistantWidget(); void startPublicAssistantWarmup() }
  const open = () => {
    prepare()
    setOptionsOpen(false)
    announceMobileSurfaceOpen('public-assistant')
    clearCollision()
    setWorkspaceMounted(true)
    setIsFullscreen(presence.bounds.mobile)
    setIsOpen(true)
    trackAnalyticsEvent('public_assistant_open', { source: 'floating-widget' })
  }
  const close = useCallback(() => {
    returnFocus.current = true
    setIsOpen(false)
  }, [])
  const settingsAction = (action: () => void) => {
    action()
    setOptionsOpen(false)
    window.requestAnimationFrame(focusPet)
  }
  const hide = () => {
    presence.setHidden(true)
    setOptionsOpen(false)
    setIsOpen(false)
    window.requestAnimationFrame(() => restoreRef.current?.focus({ preventScroll: true }))
  }
  const style = {
    '--pet-x': `${presence.x}px`, '--pet-y': `${presence.y}px`, '--pet-size': `${presence.bounds.size}px`,
    '--pet-panel-side': `${presence.bounds.gap + presence.bounds.size + 12}px`,
    '--pet-panel-top': `${Math.max(16, Math.min(presence.y, presence.bounds.height - Math.min(680, presence.bounds.height - 32) - 16))}px`,
    '--pet-options-top': `${Math.max(8, Math.min(presence.y < 280 ? presence.y + presence.bounds.size + 52 : presence.y - 244, presence.bounds.height - 204))}px`,
  } as CSSProperties
  const suppressed = presence.preference.hidden || (footerVisible && !isOpen)
  const selectedTask = snapshot.summary.items.find(item => item.sessionId === snapshot.summary.sessionId)
  const bubbleText = activity === 'review' && selectedTask?.status === 'completed' ? copy.reviewResult : copy.bubbles[activity]

  return <div ref={rootRef} lang={SITE_LANGUAGE_TAGS[language]} style={style}
    className={`public-assistant public-assistant-companion ${isOpen ? 'is-open' : ''} ${isOpen && isFullscreen ? 'is-fullscreen' : ''}`}
    data-assistant-warmup={warmup.state} data-pet-activity={activity}
    data-pet-unread-count={snapshot.unreadCount} data-pet-feedback-count={snapshot.feedbackCount}
    data-pet-side={presence.preference.side} data-pet-hidden={presence.preference.hidden}>
    <div ref={characterRef} className={`public-assistant__character ${suppressed ? 'is-suppressed' : ''} ${optionsOpen ? 'has-options' : ''} ${presence.dragging ? 'is-dragging' : ''} ${presence.y < 280 ? 'is-near-top' : ''}`}
      inert={suppressed || (isOpen && presence.bounds.mobile)} data-collision-offset="0">
      <button ref={triggerRef} type="button" className="public-assistant__trigger has-pet"
        aria-label={isOpen ? copy.close : copy.open} aria-description={description}
        aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="public-assistant-panel"
        onPointerEnter={prepare} onFocus={() => { if (!skipFocusWarmup.current) prepare() }} {...presence.pointer}
        onClick={() => { if (!presence.consumeDragClick()) { if (isOpen) close(); else open() } }}>
        <PublicAssistantPet activity={activity} completionKey={completionKey} claimFeedback={petTasks.claimFeedback} unreadCount={snapshot.unreadCount} />
      </button>
      {bubbleText && <PublicAssistantPetBubble key={`${snapshot.summary.runId}:${activity}:${selectedTask?.status}`} text={bubbleText} openLabel={copy.open} onOpen={open} onDismiss={focusPet} />}
      <div className="public-assistant__pet-actions">
        <button type="button" aria-label={isOpen ? copy.close : copy.open} title={isOpen ? copy.close : copy.open} onClick={isOpen ? close : open}><MessageCircle size={17} aria-hidden /></button>
        <button ref={optionsRef} type="button" aria-label={copy.options} title={copy.options} aria-expanded={optionsOpen} aria-controls="public-assistant-pet-options" onClick={() => setOptionsOpen(value => !value)}><MoreHorizontal size={18} aria-hidden /></button>
      </div>
      {optionsOpen && <div id="public-assistant-pet-options" className="public-assistant__pet-options" role="group" aria-label={copy.options}>
        <button type="button" onClick={() => settingsAction(() => presence.dock('left'))}><ArrowLeft size={16} aria-hidden />{copy.dockLeft}</button>
        <button type="button" onClick={() => settingsAction(() => presence.dock('right'))}><ArrowRight size={16} aria-hidden />{copy.dockRight}</button>
        <button type="button" onClick={() => settingsAction(presence.reset)}><RotateCcw size={16} aria-hidden />{copy.reset}</button>
        <button type="button" onClick={hide}><EyeOff size={16} aria-hidden />{copy.hide}</button>
      </div>}
    </div>
    {presence.preference.hidden && restoreHost && createPortal(<button ref={restoreRef} type="button" className="public-assistant__restore" onClick={() => settingsAction(() => presence.setHidden(false))}>{copy.show}</button>, restoreHost)}
    {workspaceMounted && <Suspense fallback={isOpen ? <section className="public-assistant__panel public-assistant__opening" role="dialog" aria-label={copy.open} id="public-assistant-panel"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }}>
      <p role="status">{copy.opening}</p><button type="button" autoFocus onClick={close} aria-label={copy.close}><X size={20} aria-hidden /></button>
    </section> : null}>
      <PublicAssistantWidget isOpen={isOpen} setIsOpen={setIsOpen} onClose={close} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} petTasks={petTasks} rootRef={rootRef} />
    </Suspense>}
  </div>
}
