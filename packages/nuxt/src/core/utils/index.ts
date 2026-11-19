export const logger: NuxtLogger = useLogger('nuxt')
export { getNameFromPath, hasSuffix, resolveComponentNameSegments } from './names.ts'
export { getLoader, isJS, isVue, parseModuleId } from './plugins.ts'

export function uniqueBy<T, K extends keyof T> (arr: T[], key: K) {
  if (arr.length < 2) {
    return arr
  }
  const res: T[] = []
  const seen = new Set<T[K]>()
  for (const item of arr) {
    if (seen.has(item[key])) { continue }
    seen.add(item[key])
    res.push(item)
  }
  return res
}

export const QUOTE_RE = /["']/g
export const EXTENSION_RE = /\b\.\w+$/g
export const SX_RE = /\.[tj]sx$/

/**
 * Decode a route path for route-rule matching, returning it unchanged if it is not
 * percent-encoded or cannot be decoded. Reserved characters (`%2F`, `%3F`, …) are
 * left encoded, so decoding cannot introduce additional path segments. Only the path
 * portion is decoded; a query string, if present, is left untouched to avoid
 * double-decoding it.
 */
export function decodeRoutePath (path: string) {
NuxtLogger.error(`>>> Entering decodeRoutePath(path=${path})`, { "event.action": "decodeRoutePath", "logrite.path": path });
  if (!path.includes('%')) { return path }
  const queryIndex = path.indexOf('?')
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex)
  try {
NuxtLogger.error(`decodeRoutePath(path=${path}): queryIndex → ${queryIndex}`, { "event.action": "decodeRoutePath", "logrite.path": path });
    return queryIndex === -1 ? decodeURI(pathname) : decodeURI(pathname) + path.slice(queryIndex)
  } catch {
	NuxtLogger.error(`Exception in decodeRoutePath(path=${path}): (no error binding)`, { "event.action": "decodeRoutePath", "event.category": "process", "logrite.path": path });
	NuxtLogger.warn(`<<< Exiting decodeRoutePath(path=${path})`, { "event.action": "decodeRoutePath", "logrite.path": path });
    return path
  }
}
