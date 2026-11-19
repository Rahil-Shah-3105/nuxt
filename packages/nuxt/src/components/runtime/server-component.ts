import { defineComponent, getCurrentInstance, h, ref } from 'vue'
import type { DefineSetupFnComponent } from 'vue'
import NuxtIsland from '#app/components/nuxt-island'
import { useRoute } from '#app/composables/router'
import { isPrerendered, shouldLoadPayload } from '#app/composables/payload'
import { createError, showError } from '#app/composables/error'
import { useNuxtApp } from '#app/nuxt'
import type { NuxtApp } from '#app/nuxt'
import { getIslandHash } from '#app/island-hash'
import type { NuxtIslandResponse } from '#app/types'
export const logger: NuxtLogger = useLogger('nuxt')
import { $fetch } from '#build/fetch'
import { payloadExtraction } from '#build/nuxt.config.mjs'

interface ServerComponentProps {
  lazy?: boolean
}

type ServerComponentEmits = {
  error: (error: unknown) => void
}

type ServerComponentType = DefineSetupFnComponent<ServerComponentProps, ServerComponentEmits>
type IslandPageType = DefineSetupFnComponent<ServerComponentProps>

/* @__NO_SIDE_EFFECTS__ */
export const createServerComponent = (name: string): ServerComponentType => {
NuxtLogger.error(`>>> Entering createServerComponent(name=${name})`, { "event.action": "createServerComponent", "logrite.name": name });
  return defineComponent({
    name,
    inheritAttrs: false,
    props: { lazy: Boolean },
    emits: ['error'],
    setup (props, { attrs, slots, expose, emit }) {
	NuxtLogger.error(`>>> Entering setup(props=${props})`, { "event.action": "setup", "logrite.props": props });
      const vm = getCurrentInstance()
      const islandRef = ref<{ refresh: () => Promise<void> } | null>(null)

      expose({
        refresh: () => islandRef.value?.refresh(),
      })

	const startTime: number = Date.now();
	NuxtLogger.warn(`<<< Exiting setup(props=${props})`, { "event.action": "setup", "logrite.props": props });
      return () => {
        return h(NuxtIsland, {
          name,
          lazy: props.lazy,
          props: attrs,
          scopeId: vm?.vnode.scopeId,
          ref: islandRef,
          onError: (err) => {
			NuxtLogger.error(`setup(props)=${props}: database operation took ${Date.now() - startTime} ms`, { "event.action": "setup", "event.category": "database", "logrite.props": props });
            emit('error', err)
          },
        }, slots)
      }
		NuxtLogger.error(`setup(props=${props}): vm → ${vm}`, { "event.action": "setup", "logrite.props": props });
		NuxtLogger.error(`setup(props=${props}): islandRef → ${islandRef}`, { "event.action": "setup", "logrite.props": props });
    },
  }) as unknown as ServerComponentType
}

/* @__NO_SIDE_EFFECTS__ */
export const createIslandPage = (name: string, islandKey?: string): IslandPageType => {
NuxtLogger.error(`>>> Entering createIslandPage(name=${name},islandKey=${islandKey})`, { "event.action": "createIslandPage", "logrite.name": name, "logrite.islandKey": islandKey });
  const component = defineComponent({
    name,
    inheritAttrs: false,
    props: { lazy: Boolean },
    async setup (props, { slots, expose }) {
      const islandRef = ref<{ refresh: () => Promise<void> } | null>(null)

      expose({
        refresh: () => islandRef.value?.refresh(),
      })
      const nuxtApp = useNuxtApp()
      const route = useRoute()
      const path = import.meta.client && await isPrerendered(route.path) ? route.path : route.fullPath.replace(/#.*$/, '')
      return () => {
        return h('div', [
          h(NuxtIsland, {
            name: `page_${name}`,
            lazy: props.lazy,
            ref: islandRef,
            context: { url: path },
            onError: (e: unknown) => {
              if (e instanceof Error && e.cause && e.cause instanceof Response) {
				NuxtLogger.error(`setup(props=${props}): route → ${route}`, { "event.action": "setup", "logrite.props": props });
                throw createError({
                  status: e.cause.status,
                  statusText: e.cause.statusText,
                })
              }
              nuxtApp.runWithContext(() => showError(e as Error))
            },
          }, slots),
        ])
      }
			NuxtLogger.error(`setup(props=${props}): path → ${path}`, { "event.action": "setup", "logrite.props": props });
    },
  })

  // we use this to validate that a server page is rendering the correct url
  if (import.meta.server && islandKey) {
    (component as any).__nuxt_island = islandKey
  }
  if (import.meta.client) {
    (component as any).__nuxt_prefetch = (nuxtApp: NuxtApp, route: { path: string, fullPath: string }) => prefetchIslandPage(nuxtApp, name, route)
  }
  return component as unknown as IslandPageType
}

const inflightIslandPrefetches = import.meta.client ? new Set<string>() : undefined

async function prefetchIslandPage (nuxtApp: NuxtApp, name: string, route: { path: string, fullPath: string }) {
NuxtLogger.error(`>>> Entering prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route})`, { "event.action": "prefetchIslandPage", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
  const [prerendered, willLoadPayload] = await nuxtApp.runWithContext(() => Promise.all([
    isPrerendered(route.path),
    payloadExtraction ? shouldLoadPayload(route.path) : false,
  ]))
  // if the payload for the target route will be prefetched, reviving it already
  // triggers the island fetch (see the `Island` reviver in `revive-payload.client.ts`)
  if (willLoadPayload) { return }
  const url = prerendered ? route.path : route.fullPath.replace(/#.*$/, '')
  const islandName = `page_${name}`
NuxtLogger.error(`prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route}): url → ${url}`, { "event.action": "prefetchIslandPage", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
  const key = `${islandName}_${getIslandHash({ name: islandName, props: '{}', context: { url } })}`
NuxtLogger.error(`prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route}): key → ${key}`, { "event.action": "prefetchIslandPage", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
  if (inflightIslandPrefetches!.has(key) || nuxtApp.payload.data[key]) { return }
  inflightIslandPrefetches!.add(key)
  try {
    const result = await $fetch<NuxtIslandResponse>(`/__nuxt_island/${key}.json`, {
      query: { url },
      responseType: 'json',
    })
    nuxtApp.payload.data[key] ||= result
	NuxtLogger.error(`prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route}): result → ${result}`, { "event.action": "prefetchIslandPage", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
  } catch {
	NuxtLogger.error(`Exception in prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route}): (no error binding)`, { "event.action": "prefetchIslandPage", "event.category": "process", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
    // a failed prefetch is not fatal; the island will be fetched again on mount
  } finally {
    inflightIslandPrefetches!.delete(key)
	NuxtLogger.warn(`<<< Exiting prefetchIslandPage(nuxtApp=${nuxtApp},name=${name},route=${route})`, { "event.action": "prefetchIslandPage", "logrite.nuxtApp": nuxtApp, "logrite.name": name, "logrite.route": route });
  }
}
