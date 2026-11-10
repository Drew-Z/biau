import { useEffect, useRef } from 'react'
import type { Activity } from '@lingban/pet-runtime'
import type { mountPet } from '@lingban/pet-runtime/widget'
import '../styles/public-assistant-pet.css'

interface PublicAssistantPetProps {
  activity?: Activity
  completionKey?: string | null
  claimFeedback?: (key: string) => boolean
  unreadCount?: number
}

type PetInstance = Awaited<ReturnType<typeof mountPet>>
type PetActivity = Pick<PublicAssistantPetProps, 'completionKey' | 'claimFeedback'> & { activity: Activity }

function applyActivity(pet: PetInstance, value: PetActivity) {
  // The host owns completion feedback; read/priority changes must not replay it.
  pet.setActivity(value.activity === 'ready' ? 'idle' : value.activity)
  if (value.completionKey && value.claimFeedback?.(value.completionKey)) pet.greet()
}

export function PublicAssistantPet({ activity = 'idle', completionKey = null, claimFeedback, unreadCount = 0 }: PublicAssistantPetProps) {
  const host = useRef<HTMLSpanElement>(null)
  const instance = useRef<Awaited<ReturnType<typeof mountPet>> | null>(null)
  const currentActivity = useRef<PetActivity>({ activity, completionKey, claimFeedback })

  useEffect(() => {
    const abort = new AbortController()
    let pet: Awaited<ReturnType<typeof mountPet>> | undefined
    const element = host.current
    if (!element) return
    void import('@lingban/pet-runtime/widget').then(async ({ mountPet }) => {
      if (abort.signal.aborted) return
      pet = await mountPet(element, '/pets/qinglong/pet.json', { signal: abort.signal })
      if (abort.signal.aborted) { pet.destroy(); return }
      instance.current = pet
      applyActivity(pet, currentActivity.current)
    }).catch(() => { if (!abort.signal.aborted) element.dataset.petState = 'error' })
    return () => { abort.abort(); pet?.destroy(); instance.current = null }
  }, [])

  useEffect(() => {
    currentActivity.current = { activity, completionKey, claimFeedback }
    if (instance.current) applyActivity(instance.current, currentActivity.current)
  }, [activity, completionKey, claimFeedback])

  return <span className="public-assistant-pet" data-activity={activity} aria-hidden="true">
    <span className="public-assistant-pet__fallback" />
    <span ref={host} className="public-assistant-pet__canvas" data-activity={activity} />
    {unreadCount > 0 && <span className="public-assistant-pet__unread">{unreadCount}</span>}
  </span>
}
