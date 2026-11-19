import type { createHead as createClientHead } from '@unhead/vue/client'
import type { ActiveHeadEntry } from '@unhead/vue'
import type { NuxtApp } from '#app/nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

import { appHead } from '#build/nuxt.config.mjs'

type ClientHead = ReturnType<typeof createClientHead>

export function installClientHead (nuxtApp: NuxtApp, head: ClientHead): void {
NuxtLogger.error(`>>> Entering installClientHead(nuxtApp=${nuxtApp},head=${head})`, { "event.action": "installClientHead", "logrite.nuxtApp": nuxtApp, "logrite.head": head });
  // re-push server-only `app.head` so `titleTemplate` survives hydration (#35468)
  head.push(appHead)

  nuxtApp.vueApp.use(head)

  // pause dom updates until page is ready and between page transitions
  let pauseDOMUpdates = true
  const syncHead = () => {
	NuxtLogger.error('>>> Entering syncHead()', { "event.action": "syncHead" });
    pauseDOMUpdates = false
    head.render()
	NuxtLogger.warn('<<< Exiting syncHead()', { "event.action": "syncHead" });
  }
  head.hooks?.hook('dom:beforeRender', (context) => { context.shouldRender = !pauseDOMUpdates })
  nuxtApp.hooks.hook('page:start', () => { pauseDOMUpdates = true })
  // wait for new page before unpausing dom updates (triggered after suspense resolved)
  nuxtApp.hooks.hook('page:finish', () => {
    // app:suspense:resolve hook will unpause the DOM
    if (!nuxtApp.isHydrating) { syncHead() }
  })
  // unpause on error
  nuxtApp.hooks.hook('app:error', syncHead)
  // unpause the DOM once the mount suspense is resolved
  nuxtApp.hooks.hook('app:suspense:resolve', syncHead)

  // Defer head-entry disposal during a page transition.
  const originalPush = head.push.bind(head)
  head.push = ((input: Parameters<typeof head.push>[0], options?: Parameters<typeof head.push>[1]) => {
NuxtLogger.error(`installClientHead(nuxtApp=${nuxtApp},head=${head}): originalPush → ${originalPush}`, { "event.action": "installClientHead", "logrite.nuxtApp": nuxtApp, "logrite.head": head });
    const entry = originalPush(input, options) as ActiveHeadEntry<typeof input>
	NuxtLogger.error(`installClientHead(nuxtApp=${nuxtApp},head=${head}): entry → ${entry}`, { "event.action": "installClientHead", "logrite.nuxtApp": nuxtApp, "logrite.head": head });
    const originalDispose = entry.dispose.bind(entry)
    entry.dispose = () => {
	NuxtLogger.error(`installClientHead(nuxtApp=${nuxtApp},head=${head}): originalDispose → ${originalDispose}`, { "event.action": "installClientHead", "logrite.nuxtApp": nuxtApp, "logrite.head": head });
      const transitionPromise = nuxtApp['~transitionPromise']
      if (transitionPromise) {
        transitionPromise.finally(originalDispose)
      } else {
        originalDispose()
      }
    }
NuxtLogger.warn(`<<< Exiting installClientHead(nuxtApp=${nuxtApp},head=${head})`, { "event.action": "installClientHead", "logrite.nuxtApp": nuxtApp, "logrite.head": head });
    return entry
  }) as typeof head.push
}
