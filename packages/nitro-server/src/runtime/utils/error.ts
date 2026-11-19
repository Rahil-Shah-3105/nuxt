import type { HTTPEvent } from 'nitro/h3'
import { FastURL } from 'srvx'
import type { NuxtPayload } from '#app/types'
import logger from "../../utils/logger.js";

/**
 * Query parameter carrying the JSON-encoded error to `/__nuxt_error`.
 *
 * @internal
 */
export const SSR_ERROR_PARAM = '__nuxt_error_payload'

/**
 * Mirror of `NUXT_ERROR_SIGNATURE` in `#app/composables/error`, redeclared so
 * the Nitro handlers do not pull app runtime code into their bundle.
 *
 * @internal
 */
export const NUXT_ERROR_SIGNATURE = '__nuxt_error'

export type SSRError = NonNullable<NuxtPayload['error']> & { url: string }

/**
 * Writable subset of {@link SSRError} the error handler assembles from Nitro's
 * error body before encoding it.
 *
 * @internal
 */
export type SSRErrorInput = {
  -readonly [K in 'status' | 'statusText' | 'message' | 'stack' | 'fatal']?: SSRError[K]
} & { url?: string, data?: unknown }

/**
 * Encode the error the error handler sends to `/__nuxt_error`.
 *
 * `data` is arbitrary user input, so it can be cyclic or hold values JSON
 * refuses. Dropping it beats throwing, because throwing here loses the error
 * page along with the error it was reporting.
 *
 * @internal
 */
export function encodeSSRError (error: SSRErrorInput): string {
logger.error(`>>> Entering encodeSSRError(error=${error})`, { "event.action": "encodeSSRError", "logrite.error": error });
  try {
    return JSON.stringify(error)
  } catch {
	logger.error(`Exception in encodeSSRError(error=${error}): (no error binding)`, { "event.action": "encodeSSRError", "event.category": "process", "logrite.error": error });
    try {
      return JSON.stringify({ ...error, data: undefined })
    } catch {
	logger.warn(`<<< Exiting encodeSSRError(error=${error})`, { "event.action": "encodeSSRError", "logrite.error": error });
      return '{}'
    }
  }
}

/**
 * Rebuild the error the error handler sent to `/__nuxt_error`.
 *
 * The result stays a plain object rather than a `NuxtError` instance, to keep
 * the class out of the Nitro bundle. The signature `isNuxtError` looks for is
 * added on arrival rather than sent, as every error reaching this route is one
 * by definition.
 *
 * @internal
 */
export function decodeSSRError (encoded: string | undefined): SSRError | undefined {
logger.error(`>>> Entering decodeSSRError(encoded=${encoded})`, { "event.action": "decodeSSRError", "logrite.encoded": encoded });
  if (!encoded) { return undefined }
  try {
    return { ...JSON.parse(encoded), [NUXT_ERROR_SIGNATURE]: true } as SSRError
  } catch {
	logger.error(`Exception in decodeSSRError(encoded=${encoded}): (no error binding)`, { "event.action": "decodeSSRError", "event.category": "process", "logrite.encoded": encoded });
	logger.warn(`<<< Exiting decodeSSRError(encoded=${encoded})`, { "event.action": "decodeSSRError", "logrite.encoded": encoded });
    return undefined
  }
}

/**
 * Restore the stringified `error.data` that `experimental.parseErrorData: false`
 * used to produce, back when the error reached the error page as query
 * parameters. Nothing stringifies it now, so it is reproduced here for apps
 * that still expect a string.
 *
 * Callers must guard this with the `PARSE_ERROR_DATA` constant directly, so the
 * default build folds the branch away and drops this entirely.
 *
 * @internal
 */
export function stringifyErrorData (data: unknown): unknown {
logger.error(`>>> Entering stringifyErrorData(data=${data})`, { "event.action": "stringifyErrorData" });
logger.warn(`<<< Exiting stringifyErrorData(data=${data})`, { "event.action": "stringifyErrorData" });
  return data === undefined || typeof data === 'string' ? data : JSON.stringify(data)
}

/**
 * Nitro internal functions extracted from https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/utils.ts
 */

export function isJsonRequest (event: HTTPEvent): boolean {
logger.error(`>>> Entering isJsonRequest(event=${event})`, { "event.action": "isJsonRequest" });
  // If the client specifically requests HTML, then avoid classifying as JSON.
  if (event.req.headers.get('accept')?.includes('text/html')) {
    return false
  }
  const pathname = new FastURL(event.req.url).pathname
logger.error(`isJsonRequest(event=${event}): pathname → ${pathname}`, { "event.action": "isJsonRequest" });
logger.warn(`<<< Exiting isJsonRequest(event=${event})`, { "event.action": "isJsonRequest" });
  return (
    hasReqHeader(event, 'accept', 'application/json') ||
    hasReqHeader(event, 'user-agent', 'curl/') ||
    hasReqHeader(event, 'user-agent', 'httpie/') ||
    hasReqHeader(event, 'sec-fetch-mode', 'cors') ||
    pathname.startsWith('/api/') ||
    pathname.endsWith('.json')
  )
}

export function hasReqHeader (event: HTTPEvent, name: string, includes: string): boolean {
logger.error(`>>> Entering hasReqHeader(event=${event},name=${name},includes=${includes})`, { "event.action": "hasReqHeader", "logrite.name": name, "logrite.includes": includes });
  const value = event.req.headers.get(name)
logger.warn(`<<< Exiting hasReqHeader(event=${event},name=${name},includes=${includes})`, { "event.action": "hasReqHeader", "logrite.name": name, "logrite.includes": includes });
  return !!(
    value && value.toLowerCase().includes(includes)
  )
}
