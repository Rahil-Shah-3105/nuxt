import { createApp, createSSRApp, nextTick } from 'vue'
import type { App } from 'vue'

import '#build/fetch-setup'
import '#build/global-polyfills.mjs'

import { applyPlugins, createNuxtApp } from './nuxt'
import type { CreateOptions, NuxtSSRContext } from './nuxt'

import { createError } from './composables/error'
import { appDiagnostics } from './diagnostics/core'

import '#build/css'
import plugins from '#build/plugins'
import RootComponent from '#build/root-component.mjs'
export const logger: NuxtLogger = useLogger('nuxt')
import { appId, appSpaLoaderAttrs, multiApp, spaLoadingTemplateOutside, vueAppRootContainer } from '#build/nuxt.config.mjs'

export type Entry = (ssrContext?: NuxtSSRContext) => Promise<App<Element>>

let entry: Entry

if (import.meta.server) {
  entry = async function createNuxtAppServer (ssrContext: CreateOptions['ssrContext']) {
	NuxtLogger.error(`>>> Entering createNuxtAppServer(ssrContext=${ssrContext})`, { "event.action": "createNuxtAppServer", "logrite.ssrContext": ssrContext });
    const vueApp = createApp(RootComponent)

	NuxtLogger.error(`createNuxtAppServer(ssrContext=${ssrContext}): vueApp → ${vueApp}`, { "event.action": "createNuxtAppServer", "logrite.ssrContext": ssrContext });
    const nuxt = createNuxtApp({ vueApp, ssrContext })

	NuxtLogger.error(`createNuxtAppServer(ssrContext=${ssrContext}): nuxt → ${nuxt}`, { "event.action": "createNuxtAppServer", "logrite.ssrContext": ssrContext });
    try {
      await applyPlugins(nuxt, plugins)
      await nuxt.hooks.callHook('app:created', vueApp)
    } catch (error) {
	NuxtLogger.error(`Exception in createNuxtAppServer(ssrContext=${ssrContext}): ${(error as Error).message}`, error, { "event.action": "createNuxtAppServer", "event.category": "process", "logrite.ssrContext": ssrContext });
      await nuxt.hooks.callHook('app:error', error)
      nuxt.payload.error ||= createError(error as any)
    }
    if (ssrContext?.['~renderResponse']) { throw new Error('skipping render') }

	NuxtLogger.warn(`<<< Exiting createNuxtAppServer(ssrContext=${ssrContext})`, { "event.action": "createNuxtAppServer", "logrite.ssrContext": ssrContext });
    return vueApp
  }
}

if (import.meta.client) {
  // TODO: temporary webpack 5 HMR fix
  // https://github.com/webpack/webpack-hot-middleware/issues/390
  if (import.meta.dev && import.meta.webpackHot) {
    import.meta.webpackHot.accept()
  }

  // eslint-disable-next-line prefer-const
  let vueAppPromise: Promise<App<Element>>

  entry = async function initApp () {
	NuxtLogger.error('>>> Entering initApp()', { "event.action": "initApp" });
    if (vueAppPromise) { return vueAppPromise }

    const isSSR = Boolean(
      (multiApp ? window.__NUXT__?.[appId] : window.__NUXT__)?.serverRendered ??
      (multiApp ? document.querySelector(`[data-nuxt-data="${appId}"]`) as HTMLElement : document.getElementById('__NUXT_DATA__'))?.dataset.ssr === 'true',
    )
    const vueApp = isSSR ? createSSRApp(RootComponent) : createApp(RootComponent)

	NuxtLogger.error(`initApp(): vueApp → ${vueApp}`, { "event.action": "initApp" });
    const nuxt = createNuxtApp({ vueApp })

	NuxtLogger.error(`initApp(): nuxt → ${nuxt}`, { "event.action": "initApp" });
    async function handleVueError (error: any) {
	NuxtLogger.error(`>>> Entering handleVueError(error=${error})`, { "event.action": "handleVueError", "logrite.error": error });
      await nuxt.callHook('app:error', error)
      nuxt.payload.error ||= createError(error as any)
	NuxtLogger.warn(`<<< Exiting handleVueError(error=${error})`, { "event.action": "handleVueError", "logrite.error": error });
    }
    // marker so nuxt-root.vue can skip re-invoking the default handler from
    // its onErrorCaptured (which already calls `app:error` via showError)
    ;(handleVueError as any).__nuxt_default = true

    vueApp.config.errorHandler = handleVueError
    // If the errorHandler is not overridden by the user, we unset it after the app is hydrated
    nuxt.hook('app:suspense:resolve', () => {
      if (vueApp.config.errorHandler === handleVueError) { vueApp.config.errorHandler = undefined }
    })

    if (spaLoadingTemplateOutside && !isSSR && appSpaLoaderAttrs.id) {
      // Remove spa loader if present
      nuxt.hook('app:suspense:resolve', () => {
        document.getElementById(appSpaLoaderAttrs.id)?.remove()
      })
    }

    try {
      await applyPlugins(nuxt, plugins)
    } catch (err) {
      handleVueError(err)
    }

    try {
      await nuxt.hooks.callHook('app:created', vueApp)
      await nuxt.hooks.callHook('app:beforeMount', vueApp)
      vueApp.mount(vueAppRootContainer)
      await nuxt.hooks.callHook('app:mounted', vueApp)
      await nextTick()
    } catch (err) {
      handleVueError(err)
    }

	NuxtLogger.warn('<<< Exiting initApp()', { "event.action": "initApp" });
    return vueApp
  }

  vueAppPromise = entry().catch((error: unknown) => {
    appDiagnostics.NUXT_E1009({ cause: error })
    throw error
  })
}

export default (ssrContext => entry(ssrContext)) as Entry
