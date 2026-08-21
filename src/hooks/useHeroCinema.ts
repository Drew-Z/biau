import { useLayoutEffect, type RefObject } from 'react'

interface HeroCinemaOptions {
  key?: string | number
  titleOnly?: boolean
  animateTitle?: boolean
}

export function useHeroCinema(rootRef: RefObject<HTMLElement | null>, options: HeroCinemaOptions = {}) {
  const { key = 'initial', titleOnly = false, animateTitle = true } = options

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const title = root.matches('.hero-title-rotator')
      ? root
      : root.querySelector<HTMLElement>('.hero-title-rotator')
    const chars = animateTitle && title ? Array.from(title.querySelectorAll<HTMLElement>('.char')) : []
    const eyebrow = root.querySelector<HTMLElement>('[data-cinema="eyebrow"]')
    const body = root.querySelector<HTMLElement>('[data-cinema="body"]')
    const status = root.querySelector<HTMLElement>('[data-cinema="status"]')
    const panel = root.querySelector<HTMLElement>('[data-cinema="panel"]')
    const targets = [eyebrow, body, status, panel].filter((element): element is HTMLElement => Boolean(element))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animatedElements = [animateTitle ? title : null, ...targets].filter((element): element is HTMLElement => Boolean(element))
    const previousAnimation = animatedElements.map((element) => element.style.animation)

    root.dataset.homeMotionOwner = 'gsap'
    title?.setAttribute('data-motion-owner', 'gsap')

    let disposed = false
    let revert: (() => void) | undefined

    const loadTimeline = async () => {
      const { gsap } = await import('gsap')
      if (disposed) return

      const context = gsap.context(() => {
      animatedElements.forEach((element) => {
        element.style.animation = 'none'
      })
      if (reduce) {
        gsap.set([...animatedElements, ...chars], { opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1, filter: 'none' })
        return
      }

      if (!titleOnly) {
        gsap.set(targets, { opacity: 0, y: 18, filter: 'blur(5px)' })
      } else if (title) {
        // The legacy CSS fade-up starts the title at opacity: 0. Once GSAP
        // owns the character timeline, settle the parent before revealing
        // its children so a loaded timeline cannot leave the title invisible.
        gsap.set(title, { opacity: 1, y: 0, filter: 'none' })
      }
      if (chars.length > 0) {
        gsap.set(chars, { opacity: 0, y: 24, rotateX: -12, scale: 0.985, transformOrigin: '50% 100%' })
      }

      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (!titleOnly) {
        if (eyebrow) timeline.to(eyebrow, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42 }, 0.04)
        if (chars.length > 0) {
          timeline.to(chars, { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.58, stagger: 0.028, ease: 'back.out(1.35)' }, 0.12)
        }
        if (body) timeline.to(body, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.48 }, 0.32)
        if (status) timeline.to(status, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42 }, 0.44)
        if (panel) timeline.to(panel, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.58 }, 0.2)
      } else {
        if (chars.length > 0) {
          timeline.to(chars, { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.05, stagger: 0.046, ease: 'power2.out' })
        }
      }
      }, root)
      revert = () => context.revert()
    }

    void loadTimeline().catch(() => {
      if (!disposed) animatedElements.forEach((element) => { element.style.animation = '' })
    })

    return () => {
      disposed = true
      revert?.()
      animatedElements.forEach((element, index) => {
        element.style.animation = previousAnimation[index] ?? ''
      })
      root.removeAttribute('data-home-motion-owner')
      title?.removeAttribute('data-motion-owner')
    }
  }, [animateTitle, key, rootRef, titleOnly])
}
