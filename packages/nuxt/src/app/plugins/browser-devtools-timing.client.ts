import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:browser-devtools-timing',
  enforce: 'pre',
  setup (nuxtApp) {
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    nuxtApp.hooks.beforeEach((event) => {
      // @ts-expect-error __startTime is not a public API
      event.__startTime = performance.now()
    })

    // After each
    nuxtApp.hooks.afterEach((event) => {
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
      performance.measure(event.name, {
        // @ts-expect-error __startTime is not a public API
        start: event.__startTime,
        detail: {
          devtools: {
            dataType: 'track-entry',
            track: 'nuxt',
            color: 'tertiary-dark',
          } satisfies ExtensionTrackEntryPayload,
        },
      })
    })
  },
})

type DevToolsColor =
  'primary' | 'primary-light' | 'primary-dark' |
  'secondary' | 'secondary-light' | 'secondary-dark' |
  'tertiary' | 'tertiary-light' | 'tertiary-dark' |
  'error'

interface ExtensionTrackEntryPayload {
  dataType?: 'track-entry' // Defaults to "track-entry"
  color?: DevToolsColor // Defaults to "primary"
  track: string // Required: Name of the custom track
  trackGroup?: string // Optional: Group for organizing tracks
  properties?: [string, string][] // Key-value pairs for detailed view
  tooltipText?: string // Short description for tooltip
}

export default plugin
