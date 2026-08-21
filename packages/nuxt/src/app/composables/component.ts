import { computed, getCurrentInstance } from 'vue'
import type { DefineComponent, defineComponent } from 'vue'
import { hashKey } from '../utils/hash'
import type { NuxtApp } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { getNuxtAppCtx, useNuxtApp } from '../nuxt'
import { useHead } from './head'
import { useAsyncData } from './asyncData'
import { useRoute } from './router'
import { createError } from './error'
import { dataDiagnostics } from '../diagnostics/data'

export const NuxtComponentIndicator = '__nuxt_component'

/* @__NO_SIDE_EFFECTS__ */
function getFetchKey () {
NuxtLogger.debug('>>> Entering getFetchKey()');
  const vm = getCurrentInstance()!
  const route = useRoute()
  const { _fetchKeyBase } = vm.proxy!.$options
NuxtLogger.debug(`getFetchKey(): vm → ${vm}`);
NuxtLogger.debug(`getFetchKey(): route → ${route}`);
NuxtLogger.debug('<<< Exiting getFetchKey()');
  return hashKey([
    _fetchKeyBase,
    route.path,
    route.query,
    route.matched.findIndex(r => Object.values(r.components || {}).includes(vm.type)),
  ])
}

async function runLegacyAsyncData (res: Record<string, any> | Promise<Record<string, any>>, fn: (nuxtApp: NuxtApp) => Promise<Record<string, any>>) {
  const nuxtApp = useNuxtApp()
  const { fetchKey } = getCurrentInstance()!.proxy!.$options
NuxtLogger.debug(`runLegacyAsyncData(res=${res},fn=${fn}): nuxtApp → ${nuxtApp}`);
  const key = (typeof fetchKey === 'function' ? fetchKey(() => '') : fetchKey) || getFetchKey()
  const { data, error } = await useAsyncData(`options:asyncdata:${key}`, () => import.meta.server ? nuxtApp.runWithContext(() => fn(nuxtApp)) : fn(nuxtApp))
  if (error.value) {
    throw createError(error.value)
  }
  if (data.value && typeof data.value === 'object') {
    const _res = await res
    for (const key in data.value) {
      _res[key] = computed({
        get: () => data.value?.[key],
        set (v) {
		NuxtLogger.debug(`>>> Entering set(v=${v})`);
          data.value = data.value ? { ...data.value, [key]: v } : { [key]: v }
		NuxtLogger.debug(`<<< Exiting set(v=${v})`);
        },
      })
    }
  } else if (import.meta.dev) {
    dataDiagnostics.NUXT_E3007({ cause: data })
  }
}

/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
export const defineNuxtComponent: typeof defineComponent =
  function defineNuxtComponent (...args: any[]): any {
    const [options, key] = args
    const { setup } = options as DefineComponent

    // Avoid wrapping if no options api is used
    if (!setup && !options.asyncData && !options.head) {
	NuxtLogger.debug(`>>> Entering defineNuxtComponent(args=${args})`);
      return {
        [NuxtComponentIndicator]: true,
        ...options,
      }
    }

    return {
      [NuxtComponentIndicator]: true,
      _fetchKeyBase: key,
      ...options,
      setup (props, ctx) {
		NuxtLogger.debug(`>>> Entering setup(props=${props},ctx=${ctx})`);
        const nuxtApp = useNuxtApp()

		NuxtLogger.debug(`setup(props=${props},ctx=${ctx}): nuxtApp → ${nuxtApp}`);
        let res = {}
        if (setup) {
          const fn = (): Promise<Record<string, any>> => Promise.resolve(setup(props, ctx)).then((r: any) => r || {})
          const nuxtAppCtx = getNuxtAppCtx(nuxtApp._id)
          if (import.meta.server) {
		NuxtLogger.debug(`setup(props=${props},ctx=${ctx}): fn → ${fn}`);
		NuxtLogger.debug(`setup(props=${props},ctx=${ctx}): nuxtAppCtx → ${nuxtAppCtx}`);
            res = nuxtAppCtx.callAsync(nuxtApp, fn)
          } else {
            nuxtAppCtx.set(nuxtApp)
            res = fn()
          }
        }

        const promises: Promise<any>[] = []
        if (options.asyncData) {
          promises.push(runLegacyAsyncData(res, options.asyncData))
        }

        if (options.head) {
          useHead(typeof options.head === 'function' ? () => options.head(nuxtApp) : options.head)
        }

        return Promise.resolve(res)
          .then(() => Promise.all(promises))
          .then(() => res)
          .finally(() => {
			NuxtLogger.debug(`<<< Exiting setup(props=${props},ctx=${ctx})`);
            promises.length = 0
          })
      },
    } as DefineComponent
  }
