import { stringify, uneval } from 'devalue'
import type { Script } from '@unhead/vue'

import type { NuxtPayload, NuxtSSRContext } from '#app/types'
import type { CachedResponse } from '../cache'
import logger from "../../../utils/logger.js";
import { serverDiagnostics } from '../../diagnostics'

import { appId, multiApp } from '#internal/nuxt.config.mjs'
import { NUXT_NO_SSR } from '#internal/nuxt/nitro-config.mjs'

export function renderPayloadResponse (ssrContext: NuxtSSRContext): CachedResponse {
logger.debug(`>>> Entering renderPayloadResponse(ssrContext=${ssrContext})`);
  return {
    body: encodeForwardSlashes(stringify(splitPayload(ssrContext).payload, ssrContext['~payloadReducers'])),
    status: ssrContext.event.res.status || 200,
    statusText: ssrContext.event.res.statusText || '',
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'x-powered-by': 'Nuxt',
    },
  }
logger.debug(`<<< Exiting renderPayloadResponse(ssrContext=${ssrContext})`);
}

export function renderPayloadJsonScript (opts: { ssrContext: NuxtSSRContext, data?: any, src?: string }): Script[] {
  const contents = opts.data ? encodeForwardSlashes(stringify(opts.data, opts.ssrContext['~payloadReducers'])) : ''
logger.debug(`renderPayloadJsonScript(opts=${opts}): contents → ${contents}`);
  if (import.meta.dev) {
	logger.debug(`>>> Entering renderPayloadJsonScript(opts=${opts})`);
    warnOnLargePayload(opts.ssrContext, opts.data, contents.length)
	logger.debug(`>>> Entering encodeForwardSlashes(str=${str})`);
	logger.debug(`<<< Exiting renderPayloadJsonScript(opts=${opts})`);
	logger.debug(`<<< Exiting encodeForwardSlashes(str=${str})`);
  }
  const payload: Script = {
    'type': 'application/json',
    'innerHTML': contents,
    'data-nuxt-data': appId,
    'data-ssr': !(NUXT_NO_SSR || opts.ssrContext.noSSR),
  }
  if (!multiApp) {
    payload.id = '__NUXT_DATA__'
	logger.debug(`renderPayloadJsonScript(opts=${opts}): payload.id → ${payload.id}`);
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
logger.debug(`renderPayloadJsonScript(opts=${opts}): config → ${config}`);
}

/**
 * Encode forward slashes as unicode escape sequences to prevent
 * Google from treating them as internal links and trying to crawl them.
 * @see https://github.com/nuxt/nuxt/issues/24175
 */
function encodeForwardSlashes (str: string): string {
logger.debug(`>>> Entering encodeForwardSlashes(str=${str})`);
logger.debug(`<<< Exiting encodeForwardSlashes(str=${str})`);
  return str.replaceAll('/', '\\u002F')
}

const PAYLOAD_SIZE_WARNING_BYTES = 100 * 1024
const warnedPayloadURLs = new Set<string>()

function formatPayloadSize (bytes: number): string {
logger.debug(`>>> Entering formatPayloadSize(bytes=${bytes})`);
logger.debug(`<<< Exiting formatPayloadSize(bytes=${bytes})`);
  return `${(bytes / 1024).toFixed(1)} kB`
}

export function getPayloadKeySizes (data: NuxtPayload['data'] | undefined, reducers: NuxtSSRContext['~payloadReducers']): Array<[string, number]> {
  const sizes: Array<[string, number]> = []
  for (const key in data) {
	logger.debug(`>>> Entering getPayloadKeySizes(data=${data},reducers=${reducers})`);
    try {
      sizes.push([key, stringify(data[key], reducers).length])
    } catch {
	logger.error(`Exception in getPayloadKeySizes(data=${data},reducers=${reducers}): (no error binding)`);
      // ignore entries that cannot be stringified on their own
	logger.debug(`<<< Exiting getPayloadKeySizes(data=${data},reducers=${reducers})`);
    }
  }
  return sizes.sort((a, b) => b[1] - a[1])
}

function warnOnLargePayload (ssrContext: NuxtSSRContext, data: Partial<NuxtPayload> | undefined, size: number) {
logger.debug(`>>> Entering warnOnLargePayload(ssrContext=${ssrContext},data=${data},size=${size})`);
  if (size <= PAYLOAD_SIZE_WARNING_BYTES || warnedPayloadURLs.has(ssrContext.url)) {
    return
  }
  warnedPayloadURLs.add(ssrContext.url)
  const keys = getPayloadKeySizes(data?.data, ssrContext['~payloadReducers'])
    .slice(0, 5)
    .map(([key, keySize]) => `\`${key}\` (${formatPayloadSize(keySize)})`)
    .join('\n  - ')
  serverDiagnostics.NUXT_E8006({ path: ssrContext.url, size: formatPayloadSize(size), keys: keys || undefined })
logger.debug(`<<< Exiting warnOnLargePayload(ssrContext=${ssrContext},data=${data},size=${size})`);
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
  const { data, prerenderedAt, prefetchLinks, ...initial } = ssrContext.payload
  const payload: SplitPayload['payload'] = { data, prerenderedAt }
  if (prefetchLinks?.length) {
	logger.debug(`>>> Entering splitPayload(ssrContext=${ssrContext})`);
	logger.debug(`<<< Exiting splitPayload(ssrContext=${ssrContext})`);
    payload.prefetchLinks = prefetchLinks
  }
  return {
    initial: { ...initial, prerenderedAt },
    payload,
  }
}
