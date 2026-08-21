import { withQuery } from 'ufo'
import type { NitroErrorHandler } from 'nitro/types'
import type { SerializedErrorCause } from '#app/types'
import type { H3Event } from 'nitro/h3'
import { serverFetch } from 'nitro'

import type { SSRErrorInput } from '../utils/error'
import logger from "../../utils/logger.js";
import { SSR_ERROR_PARAM, encodeSSRError, isJsonRequest } from '../utils/error'
import { generateErrorOverlayHTML } from '../utils/dev'

export default <NitroErrorHandler> async function errorhandler (error, event, { defaultHandler }) {
logger.debug(`>>> Entering errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler})`);
  // invoke default Nitro error handler (which will log appropriately if required)
  const defaultRes = await defaultHandler(error, event, { json: true })

logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): defaultRes → ${defaultRes}`);
  // return Nitro response + our headers for redirects and JSON responses
  const status = error.status || 500
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): status → ${status}`);
  const headers = new Headers(error.headers)
  if (isJsonRequest(event) || (status === 404 && defaultRes.status === 302)) {
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): headers → ${headers}`);
    const setCookies = new Set(headers.getSetCookie())
    const headerEntries = [
      new Headers(defaultRes.headers),
      ...('res' in event ? [(event.res as Response).headers.entries()] : []),
    ]
    for (const entries of headerEntries) {
      mergeHeaders(headers, entries, setCookies)
    }

    return new Response(typeof defaultRes.body === 'string' ? defaultRes.body : JSON.stringify(defaultRes.body, null, 2), {
      headers,
      status: defaultRes.status,
      statusText: defaultRes.statusText,
    })
  }

  if (import.meta.dev && defaultRes.body && typeof defaultRes.body !== 'string' && Array.isArray(defaultRes.body.stack)) {
    // normalize to string format expected by nuxt `error.vue`
    defaultRes.body.stack = defaultRes.body.stack.join('\n')
  }

  const errorObject = (defaultRes.body || {}) as SSRErrorInput
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): errorObject → ${errorObject}`);
  // we will be rendering this error internally so we pass along the error.data safely
  errorObject.data ??= error.data
  errorObject.url = event.req.url
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): errorObject.url → ${errorObject.url}`);
  // `fatal` is Nuxt-only, so Nitro's error body does not carry it
  errorObject.fatal = (error as { fatal?: boolean }).fatal ?? false
  const errorCause = import.meta.dev ? serializeErrorCause(error.cause) : undefined
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): errorCause → ${errorCause}`);

  // Merge defaultRes headers, skipping content-type (would be application/json)
  // and content-security-policy (would disable JS execution in the error page)
  mergeHeaders(headers, new Headers(defaultRes.headers), new Set(), IGNORED_ERROR_HEADERS)

  // Skip SSR error rendering if we're already inside one, to avoid recursion.
  const isRenderingError = (event as H3Event).url?.pathname.startsWith('/__nuxt_error') || !!(event as H3Event).context.nuxt?.['~rendering-error']
logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): isRenderingError → ${isRenderingError}`);

  if (!isRenderingError) {
    const eventContext = (event as H3Event).context
	logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): eventContext → ${eventContext}`);
    eventContext.nuxt ||= {}
    eventContext.nuxt['~rendering-error'] = true
  }

  // HTML response (via SSR)
  const res = !isRenderingError && await serverFetch(
    withQuery('/__nuxt_error', { [SSR_ERROR_PARAM]: encodeSSRError(errorObject) }),
    {
      headers: event.req.headers,
      redirect: 'manual',
    },
    {
      nuxt: {
        '~internal': true,
        '~rendering-error': true,
        ...(errorCause !== undefined && { '~error-cause': errorCause }),
      },
    },
  ).catch(() => null)

logger.error(`Exception in errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): (no error binding)`);
  // Fallback to static rendered error page
  if (!res) {
    const { template } = await import('../templates/error-500')
    if (import.meta.dev) {
      // TODO: Support `message` in template
      (errorObject as any).description = errorObject.message
    }
    headers.set('Content-Type', 'text/html;charset=UTF-8')

    return new Response(template(errorObject), {
      headers,
      status: defaultRes.status,
      statusText: defaultRes.statusText,
    })
  }

  let html = await res.text()

logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): html → ${html}`);
  if (import.meta.dev && !import.meta.test && typeof html === 'string') {
    const prettyResponse = await defaultHandler(error, event, { json: false })
    if (typeof prettyResponse.body === 'string') {
	logger.debug(`errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler}): prettyResponse → ${prettyResponse}`);
      html = html.replace('</body>', `${generateErrorOverlayHTML(prettyResponse.body, { startMinimized: 300 <= error.status && error.status < 500 })}</body>`)
    }
  }

  const setCookies = new Set(headers.getSetCookie())
  mergeHeaders(headers, res.headers, setCookies)
  if ('res' in event) {
    mergeHeaders(headers, (event as H3Event).res.headers, setCookies)
  }
	logger.debug(`<<< Exiting errorhandler(error=${error},event=${event},defaultHandler=${defaultHandler})`);

  return new Response(html, {
    headers,
    status: res.status && res.status !== 200 ? res.status : defaultRes.status,
    statusText: res.statusText || defaultRes.statusText,
  })
}
// Headers that should not be forwarded from the default handler or SSR render to the error page
const IGNORED_ERROR_HEADERS = new Set(['content-type', 'content-security-policy'])

function mergeHeaders (target: Headers, overrides: Headers | [string, string][] | HeadersIterator<[string, string]>, setCookies: Set<string>, ignore?: Set<string>): Headers {
  for (const [name, value] of overrides) {
    if (ignore?.has(name)) { continue }
    if (name === 'set-cookie') {
      if (!setCookies.has(value)) {
        setCookies.add(value)
        target.append(name, value)
      }
    } else {
      target.set(name, value)
    }
  }
  return target
}

function serializeErrorCause (cause: unknown, depth = 0, seen = new WeakSet<Error>()): SerializedErrorCause | undefined {
  if (depth >= 10 || (cause instanceof Error && seen.has(cause))) { return }
  if (cause instanceof Error) {
	logger.debug(`>>> Entering serializeErrorCause(cause=${cause},depth=${depth},seen=${seen})`);
    seen.add(cause)
    const nestedCause = serializeErrorCause(cause.cause, depth + 1, seen)
    return {
      name: cause.name,
      message: cause.message,
      ...(cause.stack && { stack: cause.stack }),
      ...(nestedCause !== undefined && { cause: nestedCause }),
    }
  }
  if (cause === null || typeof cause === 'string' || typeof cause === 'number' || typeof cause === 'boolean') {
    return cause
  }
}
