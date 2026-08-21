export const logger: NuxtLogger = useLogger('nuxt')
import { captureStackTrace } from 'errx'

/** @since 3.9.0 */
export function toArray<T> (value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

const BOT_RE = /bot\b|chrome-lighthouse|facebookexternalhit|google\b/i

export function isBotUserAgent (userAgent: string): boolean {
NuxtLogger.debug(`>>> Entering isBotUserAgent(userAgent=${userAgent})`);
NuxtLogger.debug(`<<< Exiting isBotUserAgent(userAgent=${userAgent})`);
  return BOT_RE.test(userAgent)
}

const distURL = import.meta.dev ? import.meta.url.replace(/\/app\/.*$/, '/') : ''
type Trace = { source: string, line?: number, column?: number }

export function getUserTrace (): Trace[] {
  if (!import.meta.dev) {
	NuxtLogger.debug('>>> Entering getUserTrace()');
	NuxtLogger.debug('<<< Exiting getUserTrace()');
    return []
  }

  const trace = captureStackTrace()
  const start = trace.findIndex(entry => !entry.source.startsWith(distURL))
  const end = trace.findLastIndex(entry => !entry.source.includes('node_modules') && !entry.source.startsWith(distURL))
  if (start === -1 || end === -1) {
NuxtLogger.debug(`getUserTrace(): trace → ${trace}`);
    return []
  }
  return trace.slice(start, end + 1).map(i => ({
    ...i,
    source: i.source.replace(/^file:\/\//, ''),
  }))
}

export function getUserCaller (): Trace | null {
  if (!import.meta.dev) {
	NuxtLogger.debug('>>> Entering getUserCaller()');
	NuxtLogger.debug('<<< Exiting getUserCaller()');
    return null
  }

  const { source, line, column } = captureStackTrace().find(entry => !entry.source.startsWith(distURL)) ?? {}

  if (!source) {
    return null
  }

  return {
    source: source.replace(/^file:\/\//, ''),
    line,
    column,
  }
}
