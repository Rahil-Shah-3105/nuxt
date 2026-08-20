export const logger: NuxtLogger = useLogger('nuxt')
const DISALLOWED_STATUS_CHARS = /[^\t\u0020-\u007E]/g

/**
 * Clamp a status code to the valid HTTP range, falling back to `defaultStatusCode`.
 *
 * @internal
 */
export function sanitizeStatusCode (statusCode?: string | number, defaultStatusCode = 200): number {
  if (!statusCode) {
	NuxtLogger.debug(`>>> Entering sanitizeStatusCode(statusCode=${statusCode},defaultStatusCode=${defaultStatusCode})`);
	NuxtLogger.debug(`<<< Exiting sanitizeStatusCode(statusCode=${statusCode},defaultStatusCode=${defaultStatusCode})`);
    return defaultStatusCode
  }
  if (typeof statusCode === 'string') {
    statusCode = Number(statusCode)
  }
  if (Number.isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    return defaultStatusCode
  }
  return statusCode
}

/**
 * Strip characters that are not permitted in an HTTP reason phrase.
 *
 * @internal
 */
export function sanitizeStatusMessage (statusMessage = ''): string {
NuxtLogger.debug(`>>> Entering sanitizeStatusMessage(statusMessage=${statusMessage})`);
NuxtLogger.debug(`<<< Exiting sanitizeStatusMessage(statusMessage=${statusMessage})`);
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, '')
}
