import type { H3Event } from 'nitro/h3'
import { FastResponse } from 'srvx'
import { useRuntimeConfig } from 'nitro/runtime-config'

import '../../context'
import { createHead } from '@unhead/vue/server'
import type { NuxtPayload, NuxtSSRContext } from '#app/types'
import { sharedPrerenderCache } from '../cache'
import unheadOptions from '#internal/unhead-options.mjs'
import logger from "../../../utils/logger.js";
import { NUXT_NO_SSR, NUXT_PRERENDER_NO_SSR_ROUTES, NUXT_SHARED_DATA } from '#internal/nuxt/nitro-config.mjs'

const PRERENDER_NO_SSR_ROUTES = new Set<string>(NUXT_PRERENDER_NO_SSR_ROUTES)

export function createSSRContext (event: H3Event): NuxtSSRContext {
  const url = event.url.pathname + event.url.search + event.url.hash
  const ssrContext: NuxtSSRContext = {
    url,
    event,
    runtimeConfig: useRuntimeConfig() as NuxtSSRContext['runtimeConfig'],
    noSSR: !!(NUXT_NO_SSR) || event.context.nuxt?.noSSR || (import.meta.prerender ? PRERENDER_NO_SSR_ROUTES.has(url) : false),
    head: createHead(unheadOptions),
    error: false,
    nuxt: undefined!, /* NuxtApp */
    payload: {},
    ['~payloadReducers']: Object.create(null),
    modules: new Set(),
  }

  if (import.meta.prerender) {
	logger.debug(`>>> Entering createSSRContext(event=${event})`);
    if (NUXT_SHARED_DATA) {
      ssrContext['~sharedPrerenderCache'] = sharedPrerenderCache!
    }
	logger.debug(`<<< Exiting createSSRContext(event=${event})`);
    ssrContext.payload.prerenderedAt = Date.now()
  }

  return ssrContext
}

export function setSSRError (ssrContext: NuxtSSRContext, error: NuxtPayload['error'] & { url: string }): void {
logger.debug(`>>> Entering setSSRError(ssrContext=${ssrContext},error=${error})`);
  ssrContext.error = true
  ssrContext.payload = { error }
logger.debug(`setSSRError(ssrContext=${ssrContext},error=${error}): ssrContext.error → ${ssrContext.error}`);
logger.debug(`setSSRError(ssrContext=${ssrContext},error=${error}): ssrContext.url → ${ssrContext.url}`);
  const url = new URL(error.url)
  ssrContext.url = url.pathname + url.search + url.hash
logger.debug(`setSSRError(ssrContext=${ssrContext},error=${error}): url → ${url}`);
}

// Layer `overlay` onto `base`, overwriting per header except `set-cookie`,
// which is appended so cookies from both sides survive.
export function mergeHeaders (base: Headers, overlay: Headers): Headers {
  for (const [name, value] of overlay) {
	logger.debug(`>>> Entering mergeHeaders(base=${base},overlay=${overlay})`);
    if (name === 'set-cookie') { continue }
	logger.debug(`<<< Exiting mergeHeaders(base=${base},overlay=${overlay})`);
    base.set(name, value)
  }
  for (const cookie of overlay.getSetCookie()) {
    base.append('set-cookie', cookie)
  }
  return base
}

export function returnRenderResponse (event: H3Event, response: Response): Response {
logger.debug(`>>> Entering returnRenderResponse(event=${event},response=${response})`);
  const headers = mergeHeaders(new Headers(event.res.headers), response.headers)
logger.debug(`<<< Exiting returnRenderResponse(event=${event},response=${response})`);
  return new FastResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// TODO: rethink this before nuxt v5
export function rethrowWithResponseHeaders (event: H3Event, error: any): never {
logger.debug(`>>> Entering rethrowWithResponseHeaders(event=${event},error=${error})`);
  error.headers = mergeHeaders(error.headers instanceof Headers ? error.headers : new Headers(error.headers), event.res.headers)
logger.debug(`<<< Exiting rethrowWithResponseHeaders(event=${event},error=${error})`);
  throw error
}
