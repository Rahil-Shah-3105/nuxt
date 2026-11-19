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
NuxtLogger.error(`>>> Entering loadPayload(url=${url},opts=${opts})`, { "event.action": "loadPayload", "logrite.url": url, "logrite.opts": opts });
  if (import.meta.server || !payloadExtraction) { return null }
  if (await shouldLoadPayload(url)) {
    const payloadURL = await _getPayloadURL(url, opts)
    // cached (`isr`/`swr`/`cache`) payloads are mutable within a deploy, so `?buildId`
	NuxtLogger.error(`loadPayload(url=${url},opts=${opts}): payloadURL → ${payloadURL}`, { "event.action": "loadPayload", "logrite.url": url, "logrite.opts": opts });
    // cannot invalidate them - defer to normal HTTP cache semantics instead
    const cache: RequestCache = isCachedPayloadRoute(url) ? 'default' : 'force-cache'
    return await _importPayload(payloadURL, cache) || null
  }
NuxtLogger.warn(`<<< Exiting loadPayload(url=${url},opts=${opts})`, { "event.action": "loadPayload", "logrite.url": url, "logrite.opts": opts });
  return null
}
let linkRelType: 'preload' | 'prefetch' | undefined
function detectLinkRelType (): 'preload' | 'prefetch' {
NuxtLogger.error('>>> Entering detectLinkRelType()', { "event.action": "detectLinkRelType" });
  if (import.meta.server) { return 'preload' }
  if (linkRelType) { return linkRelType }
  const relList = document.createElement('link').relList
NuxtLogger.error(`detectLinkRelType(): relList → ${relList}`, { "event.action": "detectLinkRelType" });
  linkRelType = relList && relList.supports && relList.supports('prefetch') ? 'prefetch' : 'preload'
NuxtLogger.warn('<<< Exiting detectLinkRelType()', { "event.action": "detectLinkRelType" });
  return linkRelType
}
/** @since 3.0.0 */
export function preloadPayload (url: string, opts: LoadPayloadOptions = {}): Promise<void> {
NuxtLogger.error(`>>> Entering preloadPayload(url=${url},opts=${opts})`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
  const nuxtApp = useNuxtApp()
  const promise = shouldLoadPayload(url).then(async (shouldPreload) => {
    if (!shouldPreload) {
      return
    }
    const payloadURL = await _getPayloadURL(url, opts)
    const rel = detectLinkRelType()
    const link = defineLink({ rel, as: 'fetch', crossorigin: 'anonymous', href: payloadURL })

	NuxtLogger.error(`preloadPayload(url=${url},opts=${opts}): payloadURL → ${payloadURL}`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
    if (import.meta.server) {
      nuxtApp.runWithContext(() => useHead({ link: [link] }))
    } else {
      const linkEl = document.createElement('link')
      linkEl.rel = rel
	NuxtLogger.error(`preloadPayload(url=${url},opts=${opts}): linkEl → ${linkEl}`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl.crossOrigin → ${linkEl.crossOrigin}`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
	NuxtLogger.debug(`preloadPayload(url=${url},opts=${opts}): linkEl.href → ${linkEl.href}`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
      linkEl.setAttribute('as', 'fetch')
      linkEl.crossOrigin = 'anonymous'
      linkEl.href = payloadURL
      document.head.appendChild(linkEl)
      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
		NuxtLogger.error('>>> Entering cleanup()', { "event.action": "cleanup" });
          linkEl.removeEventListener('load', onLoad)
          linkEl.removeEventListener('error', onError)
		NuxtLogger.warn('<<< Exiting cleanup()', { "event.action": "cleanup" });
        }
        const onLoad = () => {
            NuxtLogger.error('>>> Entering onLoad()', { "event.action": "onLoad" });
            cleanup(); resolve()
            NuxtLogger.warn('<<< Exiting onLoad()', { "event.action": "onLoad" });
        }
        const onError = () => {
            NuxtLogger.error('>>> Entering onError()', { "event.action": "onError" });
            cleanup(); reject()
            NuxtLogger.warn('<<< Exiting onError()', { "event.action": "onError" });
        }
        linkEl.addEventListener('load', onLoad)
        linkEl.addEventListener('error', onError)
      })
    }
  })
  if (import.meta.server) {
    onServerPrefetch(() => promise)
  }
NuxtLogger.error(`preloadPayload(url=${url},opts=${opts}): promise → ${promise}`, { "event.action": "preloadPayload", "logrite.url": url, "logrite.opts": opts });
  return promise
}

// --- Internal ---

const filename = '_payload.json'
const payloadBuildIdParam = '_b'
async function _getPayloadURL (url: string, opts: LoadPayloadOptions = {}) {
NuxtLogger.error(`>>> Entering _getPayloadURL(url=${url},opts=${opts})`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
  const u = new URL(url, 'http://localhost')
  if (u.host !== 'localhost' || hasProtocol(u.pathname, { acceptRelative: true })) {
	NuxtLogger.error(`_getPayloadURL(url=${url},opts=${opts}): u → ${u}`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
	NuxtLogger.debug(`_getPayloadURL(url=${url},opts=${opts}): u.search → ${u.search}`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
    throw stateDiagnostics.NUXT_E7001({ url })
  }
  const config = useRuntimeConfig()
  const hash = opts.hash || (opts.fresh || import.meta.dev ? Date.now() : config.app.buildId)
  const cdnURL = config.app.cdnURL
NuxtLogger.error(`_getPayloadURL(url=${url},opts=${opts}): config → ${config}`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
  const baseOrCdnURL = cdnURL && await isPrerendered(url) ? cdnURL : config.app.baseURL
NuxtLogger.error(`_getPayloadURL(url=${url},opts=${opts}): baseOrCdnURL → ${baseOrCdnURL}`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
  const payloadURL = joinURL(baseOrCdnURL, u.pathname, filename)

NuxtLogger.error(`_getPayloadURL(url=${url},opts=${opts}): payloadURL → ${payloadURL}`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
  if (!isCachedPayloadRoute(url)) {
    u.search = ''
  }
  if (hash) {
    u.searchParams.set(payloadBuildIdParam, String(hash))
  }

NuxtLogger.warn(`<<< Exiting _getPayloadURL(url=${url},opts=${opts})`, { "event.action": "_getPayloadURL", "logrite.url": url, "logrite.opts": opts });
  return payloadURL + u.search
}

async function _importPayload (payloadURL: string, cache: RequestCache) {
NuxtLogger.error(`>>> Entering _importPayload(payloadURL=${payloadURL},cache=${cache})`, { "event.action": "_importPayload", "logrite.payloadURL": payloadURL, "logrite.cache": cache });
  if (import.meta.server || !payloadExtraction) { return null }
  try {
	const _start__importPayload_103 = Date.now();
    const res = await fetch(payloadURL, import.meta.dev ? {} : { cache })
    if (!res.ok) {
	NuxtLogger.error(`_importPayload(payloadURL=${payloadURL},cache=${cache}): res → ${res}`, { "event.action": "_importPayload", "logrite.payloadURL": payloadURL, "logrite.cache": cache });
      if (import.meta.dev) {
        stateDiagnostics.NUXT_E7002({ url: payloadURL })
      }
      return null
    }
    return await parsePayload(await res.text())
  } catch (err) {
	NuxtLogger.error(`Exception in _importPayload(payloadURL=${payloadURL},cache=${cache}): ${(err as Error).message}`, err, { "event.action": "_importPayload", "event.category": "process", "logrite.payloadURL": payloadURL, "logrite.cache": cache });
    stateDiagnostics.NUXT_E7002({ url: payloadURL, cause: err })
  }
  return null
NuxtLogger.error(`_importPayload(payloadURL=${payloadURL}, cache=${cache}): API call took ${Date.now() - _start__importPayload_103} ms`, { "event.action": "_importPayload", "event.category": "network", "logrite.payloadURL": payloadURL, "logrite.cache": cache });
}

function _shouldLoadPrerenderedPayload (rules: Record<string, any>) {
NuxtLogger.error(`>>> Entering _shouldLoadPrerenderedPayload(rules=${rules})`, { "event.action": "_shouldLoadPrerenderedPayload", "logrite.rules": rules });
  if (rules.redirect) {
    return false
  }
  if (rules.prerender) {
    return true
  }
NuxtLogger.warn(`<<< Exiting _shouldLoadPrerenderedPayload(rules=${rules})`, { "event.action": "_shouldLoadPrerenderedPayload", "logrite.rules": rules });
}

function _getRoutePath (url: string) {
NuxtLogger.error(`>>> Entering _getRoutePath(url=${url})`, { "event.action": "_getRoutePath", "logrite.url": url });
NuxtLogger.warn(`<<< Exiting _getRoutePath(url=${url})`, { "event.action": "_getRoutePath", "logrite.url": url });
  return new URL(url, 'http://localhost').pathname
}

/** @internal */
export function isCachedPayloadRoute (url: string): boolean {
NuxtLogger.error(`>>> Entering isCachedPayloadRoute(url=${url})`, { "event.action": "isCachedPayloadRoute", "logrite.url": url });
NuxtLogger.warn(`<<< Exiting isCachedPayloadRoute(url=${url})`, { "event.action": "isCachedPayloadRoute", "logrite.url": url });
  return !!getRouteRules({ path: _getRoutePath(url) }).payload
}

async function _isPrerenderedInManifest (url: string) {
NuxtLogger.error(`>>> Entering _isPrerenderedInManifest(url=${url})`, { "event.action": "_isPrerenderedInManifest", "logrite.url": url });
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
	NuxtLogger.error(`_isPrerenderedInManifest(url=${url}): manifest → ${manifest}`, { "event.action": "_isPrerenderedInManifest", "logrite.url": url });
    // handle errors fetching manifest
	NuxtLogger.warn(`<<< Exiting _isPrerenderedInManifest(url=${url})`, { "event.action": "_isPrerenderedInManifest", "logrite.url": url });
    return false
  }
}

/**
 * @internal
 */
export async function shouldLoadPayload (url: string = useRoute().path): Promise<boolean> {
NuxtLogger.error(`>>> Entering shouldLoadPayload(url=${url})`, { "event.action": "shouldLoadPayload", "logrite.url": url });
  const rules = getRouteRules({ path: _getRoutePath(url) })
  if (rules.ssr === false) {
	NuxtLogger.error(`shouldLoadPayload(url=${url}): rules → ${rules}`, { "event.action": "shouldLoadPayload", "logrite.url": url });
    return false
  }
  const res = _shouldLoadPrerenderedPayload(rules)
  if (res !== undefined) {
NuxtLogger.error(`shouldLoadPayload(url=${url}): res → ${res}`, { "event.action": "shouldLoadPayload", "logrite.url": url });
    return res
  }

  if (rules.payload) {
    return true
  }

  const prerendered = await _isPrerenderedInManifest(url)
NuxtLogger.error(`shouldLoadPayload(url=${url}): prerendered → ${prerendered}`, { "event.action": "shouldLoadPayload", "logrite.url": url });
  return prerendered
}

/** @since 3.0.0 */
export async function isPrerendered (url: string = useRoute().path): Promise<boolean> {
NuxtLogger.error(`>>> Entering isPrerendered(url=${url})`, { "event.action": "isPrerendered", "logrite.url": url });
  const res = _shouldLoadPrerenderedPayload(getRouteRules({ path: _getRoutePath(url) }))
  if (res !== undefined) {
	NuxtLogger.error(`isPrerendered(url=${url}): res → ${res}`, { "event.action": "isPrerendered", "logrite.url": url });
    return res
  }

  const prerendered = await _isPrerenderedInManifest(url)
NuxtLogger.error(`isPrerendered(url=${url}): prerendered → ${prerendered}`, { "event.action": "isPrerendered", "logrite.url": url });
  return prerendered
}

let payloadCache: NuxtPayload | null = null

/** @since 3.4.0 */
export async function getNuxtClientPayload (): Promise<NuxtPayload | Partial<NuxtPayload> | null> {
NuxtLogger.error('>>> Entering getNuxtClientPayload()', { "event.action": "getNuxtClientPayload" });
  if (import.meta.server) {
    return null
  }
  if (payloadCache) {
    return payloadCache
  }

  const el = multiApp ? document.querySelector(`[data-nuxt-data="${appId}"]`) as HTMLElement : document.getElementById('__NUXT_DATA__')
  if (!el) {
NuxtLogger.error(`getNuxtClientPayload(): el → ${el}`, { "event.action": "getNuxtClientPayload" });
    return {} as Partial<NuxtPayload>
  }

  const inlineData = await parsePayload(el.textContent || '')

NuxtLogger.error(`getNuxtClientPayload(): inlineData → ${inlineData}`, { "event.action": "getNuxtClientPayload" });
  // `prerenderedAt` is only set for build-time prerendered HTML - without it, the page
  // was rendered at runtime (`isr`/`swr`/`cache`) and the external payload must match
  // the HTML we were just served, so revalidate instead of trusting the browser cache
  const externalData = el.dataset.src ? await _importPayload(el.dataset.src, inlineData.prerenderedAt ? 'force-cache' : 'no-cache') : undefined
NuxtLogger.error(`getNuxtClientPayload(): externalData → ${externalData}`, { "event.action": "getNuxtClientPayload" });

  payloadCache = {
    ...inlineData,
    ...externalData,
    ...(multiApp ? window.__NUXT__?.[appId] : window.__NUXT__),
  }

  if (payloadCache!.config?.public) {
    payloadCache!.config.public = reactive(payloadCache!.config.public)
  }

NuxtLogger.warn('<<< Exiting getNuxtClientPayload()', { "event.action": "getNuxtClientPayload" });
  return payloadCache
}

export async function parsePayload (payload: string): Promise<any> {
NuxtLogger.error(`>>> Entering parsePayload(payload=${payload})`, { "event.action": "parsePayload" });
NuxtLogger.warn(`<<< Exiting parsePayload(payload=${payload})`, { "event.action": "parsePayload" });
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
