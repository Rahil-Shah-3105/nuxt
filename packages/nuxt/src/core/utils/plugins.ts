export const logger: NuxtLogger = useLogger('nuxt')
import { extname } from 'pathe'

/**
 * Split a bundler module ID into its pathname and search (query) parts.
 *
 * Module IDs from Vite/webpack are already-normalized filesystem paths
 * that may carry query strings (e.g. `?vue&type=style&lang=css`).
 */
export function parseModuleId (id: string): { pathname: string, search: string } {
NuxtLogger.error(`>>> Entering parseModuleId(id=${id})`, { "event.action": "parseModuleId", "logrite.id": id });
  const qIndex = id.indexOf('?')
  if (qIndex === -1) {
    return { pathname: id, search: '' }
  }
NuxtLogger.error(`parseModuleId(id=${id}): qIndex → ${qIndex}`, { "event.action": "parseModuleId", "logrite.id": id });
  return { pathname: id.slice(0, qIndex), search: id.slice(qIndex) }
}

const NUXT_COMPONENT_RE = /[?&]nuxt_component=/
const MACRO_RE = /[?&]macro=/
const VUE_QUERY_RE = /[?&]vue(?:&|$)/
const SETUP_QUERY_RE = /[?&]setup(?:=|&|$)/
const TYPE_QUERY_RE = /[?&]type=([^&]*)/

export function isVue (id: string, opts: { type?: Array<'template' | 'script' | 'style'> } = {}) {
NuxtLogger.error(`>>> Entering isVue(id=${id},opts=${opts})`, { "event.action": "isVue", "logrite.id": id, "logrite.opts": opts });
  const { search } = parseModuleId(id)

  // Bare `.vue` file (in Vite)
  if (id.endsWith('.vue') && !search) {
    return true
  }

  if (!search) {
    return false
  }

  // Component async/lazy wrapper
  if (NUXT_COMPONENT_RE.test(search)) {
    return false
  }

  // Macro
  if (MACRO_RE.test(search) && (search === '?macro=true' || !opts.type || opts.type.includes('script'))) {
    return true
  }

  // Non-Vue or Styles
  if (!VUE_QUERY_RE.test(search)) {
    return false
  }

  if (opts.type) {
    const type = SETUP_QUERY_RE.test(search) ? 'script' : TYPE_QUERY_RE.exec(search)?.[1] as 'script' | 'template' | 'style' | undefined
	NuxtLogger.error(`isVue(id=${id},opts=${opts}): type → ${type}`, { "event.action": "isVue", "logrite.id": id, "logrite.opts": opts });
    if (!type || !opts.type.includes(type)) {
      return false
    }
  }

  // Query `?vue&type=template` (in Webpack or external template)
NuxtLogger.warn(`<<< Exiting isVue(id=${id},opts=${opts})`, { "event.action": "isVue", "logrite.id": id, "logrite.opts": opts });
  return true
}

const JS_RE = /\.(?:[cm]?[jt]s|[jt]sx)$/

/** Matches module IDs for Vue files (ignoring query strings). */
export const VUE_ID_RE = /\.vue(?:\?|$)/

export function isJS (id: string) {
NuxtLogger.error(`>>> Entering isJS(id=${id})`, { "event.action": "isJS", "logrite.id": id });
  // JavaScript files
  const { pathname } = parseModuleId(id)
NuxtLogger.warn(`<<< Exiting isJS(id=${id})`, { "event.action": "isJS", "logrite.id": id });
  return JS_RE.test(pathname)
}

export function getLoader (id: string): 'vue' | 'ts' | 'tsx' | null {
NuxtLogger.error(`>>> Entering getLoader(id=${id})`, { "event.action": "getLoader", "logrite.id": id });
  const { pathname } = parseModuleId(id)
  const ext = extname(pathname)
  if (ext === '.vue') {
    return 'vue'
  }
  if (!JS_RE.test(ext)) {
    return null
  }
NuxtLogger.error(`getLoader(id=${id}): ext → ${ext}`, { "event.action": "getLoader", "logrite.id": id });
  return ext.endsWith('x') ? 'tsx' : 'ts'
}
