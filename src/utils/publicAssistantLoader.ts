let publicAssistantLoadPromise: Promise<{ default: typeof import('../components/PublicAssistantWidget').PublicAssistantWidget }> | null = null

export function loadPublicAssistantWidget() {
  if (!publicAssistantLoadPromise) {
    publicAssistantLoadPromise = import('../components/PublicAssistantWidget')
      .then((module) => ({ default: module.PublicAssistantWidget }))
      .catch((error) => {
        publicAssistantLoadPromise = null
        throw error
      })
  }
  return publicAssistantLoadPromise
}
