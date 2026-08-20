import { hasProtocol, joinURL } from 'ufo'
import { parse } from 'devalue'
import { defineLink } from '@unhead/vue'
import { onServerPrefetch, reactive } from 'vue'
import { isInComponentSetup, tryUseNuxtApp, useNuxtApp, useRuntimeConfig } from '../nuxt'
import type { NuxtPayload } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { useHead } from './head'

import { useRoute } from './router'
import { getAppManifest, getRouteRules } from './manifest'
import { stateDiagnostics } from '../diagnostics/state'

import { appId, appManifest, multiApp, payloadExtraction } from '#build/nuxt.config.mjs'

interface LoadPayloadOptions {
  fresh?: boolean
  hash?: string
}

/** @since 3.0.0 */
export async function loadPayload (url: string, opts: LoadPayloadOptions = {}): Promise<Record<string, any> | null> {
  if (import.meta.server || !payloadExtraction) { return null }
  if (await shouldLoadPayload(url)) {
	NuxtLogger.debug(`>>> Entering loadPayload(url=${url},opts=${opts})`);
    const payloadURL = await _getPayloadURL(url, opts)
    // cached (`isr`/`swr`/`cache`) payloads are mutable within a deploy, so `?buildId`
    // cannot invalidate them - defer to normal HTTP cache semantics instead
    const cache: RequestCache = isCachedPayloadRoute(url) ? 'default' : 'force-cache'
	NuxtLogger.debug(`loadPayload(url=${url},opts=${opts}): payloadURL → ${payloadURL}`);
    return await _importPayload(payloadURL, cache) || null
	NuxtLogger.debug(`>>> Entering shouldLoadPayload(url=${url})`);
	NuxtLogger.debug(`<<< Exiting loadPayload(url=${url},opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting shouldLoadPayload(url=${url})`);
  }
  return null
}
let linkRelType: 'preload' | 'prefetch' | undefined
function detectLinkRelType (): 'preload' | 'prefetch' {
NuxtLogger.debug('>>> Entering detectLinkRelType()');
  if (import.meta.server) { return 'preload' }
  if (linkRelType) { return linkRelType }
  const relList = document.createElement('link').relList
NuxtLogger.debug(`detectLinkRelType(): relList → ${relList}`);
  linkRelType = relList && relList.supports && relList.supports('prefetch') ? 'prefetch' : 'preload'
NuxtLogger.debug('<<< Exiting detectLinkRelType()');
  return linkRelType
}
/** @since 3.0.0 */
export function preloadPayload (url: string, opts: LoadPayloadOptions = {}): Promise<void> {
  const nuxtApp = useNuxtApp()
  const promise = shouldLoadPayload(url).then(async (shouldPreload) => {
	NuxtLogger.debug(`>>> Entering preloadPayload(url=${url},opts=${opts})`);
    if (!shouldPreload) {
      return
    }
    const payloadURL = await _getPayloadURL(url, opts)
    const rel = detectLinkRelType()
    const link = defineLink({ rel, as: 'fetch', crossorigin: 'anonymous', href: payloadURL })

	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): payloadURL → ${payloadURL}`);
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): rel → ${rel}`);
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): link → ${link}`);
    if (import.meta.server) {
      nuxtApp.runWithContext(() => useHead({ link: [link] }))
    } else {
      const linkEl = document.createElement('link')
      linkEl.rel = rel
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl → ${linkEl}`);
      linkEl.setAttribute('as', 'fetch')
      linkEl.crossOrigin = 'anonymous'
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl.rel → ${linkEl.rel}`);
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl.crossOrigin → ${linkEl.crossOrigin}`);
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl.href → ${linkEl.href}`);
      linkEl.href = payloadURL
      document.head.appendChild(linkEl)
      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
		NuxtLogger.debug('>>> Entering cleanup()');
          linkEl.removeEventListener('load', onLoad)
          linkEl.removeEventListener('error', onError)
		NuxtLogger.debug('<<< Exiting cleanup()');
        }
        const onLoad = () => { cleanup(); resolve() }
        const onError = () => { cleanup(); reject() }
        linkEl.addEventListener('load', onLoad)
        linkEl.addEventListener('error', onError)
      })
	NuxtLogger.debug(`>>> Entering _getPayloadURL(url=${url},opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting _getPayloadURL(url=${url},opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting preloadPayload(url=${url},opts=${opts})`);
    }
  })
  if (import.meta.server) {
    onServerPrefetch(() => promise)
  }
  return promise
}

// --- Internal ---

const filename = '_payload.json'
const payloadBuildIdParam = '_b'
async function _getPayloadURL (url: string, opts: LoadPayloadOptions = {}) {
NuxtLogger.debug(`>>> Entering _getPayloadURL(url=${url},opts=${opts})`);
  const u = new URL(url, 'http://localhost')
  if (u.host !== 'localhost' || hasProtocol(u.pathname, { acceptRelative: true })) {
	NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): u → ${u}`);
    throw stateDiagnostics.NUXT_E7001({ url })
  }
  const config = useRuntimeConfig()
  const hash = opts.hash || (opts.fresh || import.meta.dev ? Date.now() : config.app.buildId)
  const cdnURL = config.app.cdnURL
NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): config → ${config}`);
  const baseOrCdnURL = cdnURL && await isPrerendered(url) ? cdnURL : config.app.baseURL
NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): baseOrCdnURL → ${baseOrCdnURL}`);
  const payloadURL = joinURL(baseOrCdnURL, u.pathname, filename)

NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): payloadURL → ${payloadURL}`);
  if (!isCachedPayloadRoute(url)) {
    u.search = ''
	NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): u.search → ${u.search}`);
	NuxtLogger.debug(`>>> Entering isPrerendered(url=${url})`);
	NuxtLogger.debug(`<<< Exiting isPrerendered(url=${url})`);
  }
  if (hash) {
    u.searchParams.set(payloadBuildIdParam, String(hash))
  }

NuxtLogger.debug(`<<< Exiting _getPayloadURL(url=${url},opts=${opts})`);
  return payloadURL + u.search
}

async function _importPayload (payloadURL: string, cache: RequestCache) {
NuxtLogger.debug(`>>> Entering _importPayload(payloadURL=${payloadURL},cache=${cache})`); const _start = Date.now();
  if (import.meta.server || !payloadExtraction) { return null }
  try {
    const res = await fetch(payloadURL, import.meta.dev ? {} : { cache })
    if (!res.ok) {
	NuxtLogger.debug(`_importPayload(payloadURL=${payloadURL},cache=${cache}): res → ${res}`);
      if (import.meta.dev) {
        stateDiagnostics.NUXT_E7002({ url: payloadURL })
      }
      return null
    }
    return await parsePayload(await res.text())
  } catch (err) {
	NuxtLogger.error(`Exception in _importPayload(payloadURL=${payloadURL},cache=${cache}): ${(err as Error).message}`, err);
    stateDiagnostics.NUXT_E7002({ url: payloadURL, cause: err })
	NuxtLogger.debug(`<<< Exiting parsePayload(payload=${payload})`);
  }
  return null
NuxtLogger.info(`_importPayload(payloadURL=${payloadURL}, cache=${cache}): API call took ${Date.now() - _start} ms`);
NuxtLogger.debug(`<<< Exiting _importPayload(payloadURL=${payloadURL},cache=${cache})`);
}

function _shouldLoadPrerenderedPayload (rules: Record<string, any>) {
NuxtLogger.debug(`>>> Entering _shouldLoadPrerenderedPayload(rules=${rules})`);
  if (rules.redirect) {
    return false
  }
  if (rules.prerender) {
NuxtLogger.debug(`<<< Exiting _shouldLoadPrerenderedPayload(rules=${rules})`);
    return true
  }
}

function _getRoutePath (url: string) {
NuxtLogger.debug(`>>> Entering _getRoutePath(url=${url})`);
NuxtLogger.debug(`<<< Exiting _getRoutePath(url=${url})`);
  return new URL(url, 'http://localhost').pathname
}

/** @internal */
export function isCachedPayloadRoute (url: string): boolean {
NuxtLogger.debug(`>>> Entering isCachedPayloadRoute(url=${url})`);
NuxtLogger.debug(`<<< Exiting isCachedPayloadRoute(url=${url})`);
  return !!getRouteRules({ path: _getRoutePath(url) }).payload
}

async function _isPrerenderedInManifest (url: string) {
NuxtLogger.debug(`>>> Entering _isPrerenderedInManifest(url=${url})`);
  // Note: Alternative for server is checking x-nitro-prerender header
  if (!appManifest) {
    return false
  }
  url = _getRoutePath(url)
  url = url === '/' ? url : url.replace(/\/$/, '')
  try {
    const manifest = await getAppManifest()
    return manifest.prerendered.includes(url)
  } catch {
	NuxtLogger.debug(`_isPrerenderedInManifest(url=${url}): manifest → ${manifest}`);
    // handle errors fetching manifest
	NuxtLogger.debug(`<<< Exiting _isPrerenderedInManifest(url=${url})`);
    return false
  }
}

/**
 * @internal
 */
export async function shouldLoadPayload (url: string = useRoute().path): Promise<boolean> {
  const rules = getRouteRules({ path: _getRoutePath(url) })
  if (rules.ssr === false) {
NuxtLogger.debug(`shouldLoadPayload(url=${url}): rules → ${rules}`);
    return false
  }
  const res = _shouldLoadPrerenderedPayload(rules)
  if (res !== undefined) {
NuxtLogger.debug(`shouldLoadPayload(url=${url}): res → ${res}`);
    return res
  }

  if (rules.payload) {
    return true
  }

  const prerendered = await _isPrerenderedInManifest(url)
NuxtLogger.debug(`shouldLoadPayload(url=${url}): prerendered → ${prerendered}`);
  return prerendered
}

/** @since 3.0.0 */
export async function isPrerendered (url: string = useRoute().path): Promise<boolean> {
  const res = _shouldLoadPrerenderedPayload(getRouteRules({ path: _getRoutePath(url) }))
  if (res !== undefined) {
NuxtLogger.debug(`isPrerendered(url=${url}): res → ${res}`);
    return res
  }

  const prerendered = await _isPrerenderedInManifest(url)
NuxtLogger.debug(`isPrerendered(url=${url}): prerendered → ${prerendered}`);
  return prerendered
}

let payloadCache: NuxtPayload | null = null

/** @since 3.4.0 */
export async function getNuxtClientPayload (): Promise<NuxtPayload | Partial<NuxtPayload> | null> {
  if (import.meta.server) {
	NuxtLogger.debug('>>> Entering getNuxtClientPayload()');
	NuxtLogger.debug('<<< Exiting getNuxtClientPayload()');
    return null
  }
  if (payloadCache) {
    return payloadCache
  }

  const el = multiApp ? document.querySelector(`[data-nuxt-data="${appId}"]`) as HTMLElement : document.getElementById('__NUXT_DATA__')
  if (!el) {
NuxtLogger.debug(`getNuxtClientPayload(): el → ${el}`);
    return {} as Partial<NuxtPayload>
  }

  const inlineData = await parsePayload(el.textContent || '')

NuxtLogger.debug(`getNuxtClientPayload(): inlineData → ${inlineData}`);
  // `prerenderedAt` is only set for build-time prerendered HTML - without it, the page
  // was rendered at runtime (`isr`/`swr`/`cache`) and the external payload must match
  // the HTML we were just served, so revalidate instead of trusting the browser cache
  const externalData = el.dataset.src ? await _importPayload(el.dataset.src, inlineData.prerenderedAt ? 'force-cache' : 'no-cache') : undefined
NuxtLogger.debug(`getNuxtClientPayload(): externalData → ${externalData}`);

  payloadCache = {
    ...inlineData,
    ...externalData,
    ...(multiApp ? window.__NUXT__?.[appId] : window.__NUXT__),
  }

  if (payloadCache!.config?.public) {
    payloadCache!.config.public = reactive(payloadCache!.config.public)
  }

  return payloadCache
}

export async function parsePayload (payload: string): Promise<any> {
NuxtLogger.debug(`>>> Entering parsePayload(payload=${payload})`);
NuxtLogger.debug(`<<< Exiting parsePayload(payload=${payload})`);
  return await parse(payload, useNuxtApp()._payloadRevivers)
}

/**
 * This is an experimental function for configuring passing rich data from server -> client.
 * @since 3.4.0
 */
export function definePayloadReducer (
  name: string,
  reduce: (data: any) => any,
): void {
  if (import.meta.server) {
    useNuxtApp().ssrContext!['~payloadReducers'][name] = reduce
  }
}

/**
 * This is an experimental function for configuring passing rich data from server -> client.
 *
 * This function _must_ be called in a Nuxt plugin that is `unshift`ed to the beginning of the Nuxt plugins array.
 * @since 3.4.0
 */
export function definePayloadReviver (
  name: string,
  revive: (data: any) => any | undefined,
): void {
  if (import.meta.dev) {
    const nuxtApp = tryUseNuxtApp()
    if (nuxtApp && isInComponentSetup(nuxtApp)) {
      stateDiagnostics.NUXT_E7004()
    }
  }
  if (import.meta.client) {
    useNuxtApp()._payloadRevivers[name] = revive
  }
}
