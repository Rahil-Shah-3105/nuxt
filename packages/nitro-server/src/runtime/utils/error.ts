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
logger.debug(`>>> Entering encodeSSRError(error=${error})`);
  try {
    return JSON.stringify(error)
  } catch {
	logger.error(`Exception in encodeSSRError(error=${error}): (no error binding)`);
    try {
      return JSON.stringify({ ...error, data: undefined })
    } catch {
	logger.debug(`<<< Exiting encodeSSRError(error=${error})`);
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
logger.debug(`>>> Entering decodeSSRError(encoded=${encoded})`);
  if (!encoded) { return undefined }
  try {
    return { ...JSON.parse(encoded), [NUXT_ERROR_SIGNATURE]: true } as SSRError
  } catch {
	logger.error(`Exception in decodeSSRError(encoded=${encoded}): (no error binding)`);
	logger.debug(`<<< Exiting decodeSSRError(encoded=${encoded})`);
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
logger.debug(`>>> Entering stringifyErrorData(data=${data})`);
logger.debug(`<<< Exiting stringifyErrorData(data=${data})`);
  return data === undefined || typeof data === 'string' ? data : JSON.stringify(data)
}

/**
 * Nitro internal functions extracted from https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/utils.ts
 */

export function isJsonRequest (event: HTTPEvent): boolean {
  // If the client specifically requests HTML, then avoid classifying as JSON.
  if (event.req.headers.get('accept')?.includes('text/html')) {
	logger.debug(`>>> Entering isJsonRequest(event=${event})`);
	logger.debug(`<<< Exiting isJsonRequest(event=${event})`);
    return false
  }
  const pathname = new FastURL(event.req.url).pathname
logger.debug(`isJsonRequest(event=${event}): pathname → ${pathname}`);
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
logger.debug(`>>> Entering hasReqHeader(event=${event},name=${name},includes=${includes})`);
  const value = event.req.headers.get(name)
logger.debug(`hasReqHeader(event=${event},name=${name},includes=${includes}): value → ${value}`);
logger.debug(`<<< Exiting hasReqHeader(event=${event},name=${name},includes=${includes})`);
  return !!(
    value && value.toLowerCase().includes(includes)
  )
}
