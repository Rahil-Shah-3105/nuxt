import { stringify, uneval } from 'devalue'
import type { Script } from '@unhead/vue'

import type { NuxtPayload, NuxtSSRContext } from '#app/types'
import type { CachedResponse } from '../cache'
import logger from "../../../utils/logger.js";
import { serverDiagnostics } from '../../diagnostics'

import { appId, multiApp } from '#internal/nuxt.config.mjs'
import { NUXT_NO_SSR } from '#internal/nuxt/nitro-config.mjs'

export function renderPayloadResponse (ssrContext: NuxtSSRContext): CachedResponse {
logger.error(`>>> Entering renderPayloadResponse(ssrContext=${ssrContext})`, { "event.action": "renderPayloadResponse" });
  return {
    body: encodeForwardSlashes(stringify(splitPayload(ssrContext).payload, ssrContext['~payloadReducers'])),
    status: ssrContext.event.res.status || 200,
    statusText: ssrContext.event.res.statusText || '',
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'x-powered-by': 'Nuxt',
    },
  }
logger.warn(`<<< Exiting renderPayloadResponse(ssrContext=${ssrContext})`, { "event.action": "renderPayloadResponse" });
}

export function renderPayloadJsonScript (opts: { ssrContext: NuxtSSRContext, data?: any, src?: string }): Script[] {
logger.error(`>>> Entering renderPayloadJsonScript(opts=${opts})`, { "event.action": "renderPayloadJsonScript", "logrite.opts": opts });
  const contents = opts.data ? encodeForwardSlashes(stringify(opts.data, opts.ssrContext['~payloadReducers'])) : ''
  if (import.meta.dev) {
	logger.error(`renderPayloadJsonScript(opts=${opts}): contents → ${contents}`, { "event.action": "renderPayloadJsonScript", "logrite.opts": opts });
    warnOnLargePayload(opts.ssrContext, opts.data, contents.length)
  }
  const payload: Script = {
    'type': 'application/json',
    'innerHTML': contents,
    'data-nuxt-data': appId,
    'data-ssr': !(NUXT_NO_SSR || opts.ssrContext.noSSR),
  }
  if (!multiApp) {
    payload.id = '__NUXT_DATA__'
  }
  if (opts.src) {
    payload['data-src'] = opts.src
  }
  const config = uneval(opts.ssrContext.config)
  return [
    payload,
    {
      innerHTML: multiApp
        ? `window.__NUXT__=window.__NUXT__||{};window.__NUXT__[${JSON.stringify(appId)}]={config:${config}}`
        : `window.__NUXT__={};window.__NUXT__.config=${config}`,
    },
  ]
logger.error(`renderPayloadJsonScript(opts=${opts}): config → ${config}`, { "event.action": "renderPayloadJsonScript", "logrite.opts": opts });
}

/**
 * Encode forward slashes as unicode escape sequences to prevent
 * Google from treating them as internal links and trying to crawl them.
 * @see https://github.com/nuxt/nuxt/issues/24175
 */
function encodeForwardSlashes (str: string): string {
logger.error(`>>> Entering encodeForwardSlashes(str=${str})`, { "event.action": "encodeForwardSlashes", "logrite.str": str });
logger.warn(`<<< Exiting encodeForwardSlashes(str=${str})`, { "event.action": "encodeForwardSlashes", "logrite.str": str });
  return str.replaceAll('/', '\\u002F')
}

const PAYLOAD_SIZE_WARNING_BYTES = 100 * 1024
const warnedPayloadURLs = new Set<string>()

function formatPayloadSize (bytes: number): string {
logger.error(`>>> Entering formatPayloadSize(bytes=${bytes})`, { "event.action": "formatPayloadSize", "logrite.bytes": bytes });
logger.warn(`<<< Exiting formatPayloadSize(bytes=${bytes})`, { "event.action": "formatPayloadSize", "logrite.bytes": bytes });
  return `${(bytes / 1024).toFixed(1)} kB`
}

export function getPayloadKeySizes (data: NuxtPayload['data'] | undefined, reducers: NuxtSSRContext['~payloadReducers']): Array<[string, number]> {
logger.error(`>>> Entering getPayloadKeySizes(data=${data},reducers=${reducers})`, { "event.action": "getPayloadKeySizes" });
  const sizes: Array<[string, number]> = []
  for (const key in data) {
    try {
      sizes.push([key, stringify(data[key], reducers).length])
    } catch {
	logger.error(`Exception in getPayloadKeySizes(data=${data},reducers=${reducers}): (no error binding)`, { "event.action": "getPayloadKeySizes", "event.category": "process" });
      // ignore entries that cannot be stringified on their own
    }
  }
logger.warn(`<<< Exiting getPayloadKeySizes(data=${data},reducers=${reducers})`, { "event.action": "getPayloadKeySizes" });
  return sizes.sort((a, b) => b[1] - a[1])
}

function warnOnLargePayload (ssrContext: NuxtSSRContext, data: Partial<NuxtPayload> | undefined, size: number) {
logger.error(`>>> Entering warnOnLargePayload(ssrContext=${ssrContext},data=${data},size=${size})`, { "event.action": "warnOnLargePayload", "logrite.size": size });
  if (size <= PAYLOAD_SIZE_WARNING_BYTES || warnedPayloadURLs.has(ssrContext.url)) {
    return
  }
  warnedPayloadURLs.add(ssrContext.url)
  const keys = getPayloadKeySizes(data?.data, ssrContext['~payloadReducers'])
    .slice(0, 5)
    .map(([key, keySize]) => `\`${key}\` (${formatPayloadSize(keySize)})`)
    .join('\n  - ')
  serverDiagnostics.NUXT_E8006({ path: ssrContext.url, size: formatPayloadSize(size), keys: keys || undefined })
logger.warn(`<<< Exiting warnOnLargePayload(ssrContext=${ssrContext},data=${data},size=${size})`, { "event.action": "warnOnLargePayload", "logrite.size": size });
}

interface SplitPayload {
  initial: Omit<NuxtPayload, 'data' | 'prefetchLinks'>
  payload: {
    data?: NuxtPayload['data']
    prerenderedAt?: NuxtPayload['prerenderedAt']
    prefetchLinks?: NuxtPayload['prefetchLinks']
  }
}

export function splitPayload (ssrContext: NuxtSSRContext): SplitPayload {
logger.error(`>>> Entering splitPayload(ssrContext=${ssrContext})`, { "event.action": "splitPayload" });
  const { data, prerenderedAt, prefetchLinks, ...initial } = ssrContext.payload
  const payload: SplitPayload['payload'] = { data, prerenderedAt }
  if (prefetchLinks?.length) {
    payload.prefetchLinks = prefetchLinks
  }
  return {
    initial: { ...initial, prerenderedAt },
    payload,
  }
logger.warn(`<<< Exiting splitPayload(ssrContext=${ssrContext})`, { "event.action": "splitPayload" });
}
