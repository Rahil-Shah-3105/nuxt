export const logger: NuxtLogger = useLogger('nuxt')
const DISALLOWED_STATUS_CHARS = /[^\t\u0020-\u007E]/g

/**
 * Clamp a status code to the valid HTTP range, falling back to `defaultStatusCode`.
 *
 * @internal
 */
export function sanitizeStatusCode (statusCode?: string | number, defaultStatusCode = 200): number {
NuxtLogger.error(`>>> Entering sanitizeStatusCode(statusCode=${statusCode},defaultStatusCode=${defaultStatusCode})`, { "event.action": "sanitizeStatusCode", "logrite.statusCode": statusCode, "logrite.defaultStatusCode": defaultStatusCode });
  if (!statusCode) {
    return defaultStatusCode
  }
  if (typeof statusCode === 'string') {
    statusCode = Number(statusCode)
  }
  if (Number.isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    return defaultStatusCode
  }
NuxtLogger.warn(`<<< Exiting sanitizeStatusCode(statusCode=${statusCode},defaultStatusCode=${defaultStatusCode})`, { "event.action": "sanitizeStatusCode", "logrite.statusCode": statusCode, "logrite.defaultStatusCode": defaultStatusCode });
  return statusCode
}

/**
 * Strip characters that are not permitted in an HTTP reason phrase.
 *
 * @internal
 */
export function sanitizeStatusMessage (statusMessage = ''): string {
NuxtLogger.error(`>>> Entering sanitizeStatusMessage(statusMessage=${statusMessage})`, { "event.action": "sanitizeStatusMessage", "logrite.statusMessage": statusMessage });
NuxtLogger.warn(`<<< Exiting sanitizeStatusMessage(statusMessage=${statusMessage})`, { "event.action": "sanitizeStatusMessage", "logrite.statusMessage": statusMessage });
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, '')
}
