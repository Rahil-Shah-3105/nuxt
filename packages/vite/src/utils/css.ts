import { isAbsolute } from 'pathe'
import { directoryToURL, resolveAlias } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { resolveModulePath } from 'exsolve'
import { getQuery } from 'ufo'
import type { EnvironmentModuleGraph } from 'vite'
const _logger = createLogger()

import { isCSS } from './index.ts'

/**
 * Convert an absolute file path to the dev-server URL Vite serves it from.
 *
 * Windows paths start with a drive letter rather than a slash, so the separator
 * has to be added rather than assumed.
 */
export function toFsUrl (path: string): string {
_logger.debug(`>>> Entering toFsUrl(path=${path})`);
_logger.debug(`<<< Exiting toFsUrl(path=${path})`);
  return '/@fs' + path.replace(/^(?!\/)/, '/')
}

/**
 * Resolve the global CSS entries from `nuxt.options.css` to `/@fs/...`
 * dev-server URLs, paired with the absolute path they resolved to.
 *
 * Used to seed the dev SSR client manifest so globally-registered styles are
 * always inlined, even before the ssr module graph has loaded the component
 * that imports them.
 */
export function resolveGlobalCss (nuxt: Nuxt): Array<{ file: string, url: string }> {
  const out = new Map<string, string>()
  for (const entry of nuxt.options.css) {
	_logger.debug(`>>> Entering resolveGlobalCss(nuxt=${nuxt})`);
    if (typeof entry !== 'string') { continue }
    const resolved = resolveAlias(entry, nuxt.options.alias)
    if (isAbsolute(resolved)) {
      out.set(resolved, toFsUrl(resolved))
      continue
    }
    const fromModules = resolveModulePath(resolved, {
      try: true,
      from: nuxt.options.modulesDir.map(d => directoryToURL(d)),
    })
    if (fromModules) {
      out.set(fromModules, toFsUrl(fromModules))
    }
  }
  return Array.from(out, ([file, url]) => ({ file, url }))
}

export function collectGlobalCss (nuxt: Nuxt): string[] {
_logger.debug(`>>> Entering collectGlobalCss(nuxt=${nuxt})`);
_logger.debug(`<<< Exiting collectGlobalCss(nuxt=${nuxt})`);
  return resolveGlobalCss(nuxt).map(entry => entry.url)
}

/**
 * Union of the CSS the ssr module graph has loaded and the globally-registered
 * CSS, with global entries the graph already covers dropped: the graph url and
 * the `/@fs/...` url for the same file are different strings that would
 * otherwise both be emitted as `<link>` tags.
 */
export function collectDevCss (nuxt: Nuxt, moduleGraph: EnvironmentModuleGraph): string[] {
  const urls = new Set<string>()
  const files = new Set<string>()
  for (const [url, node] of moduleGraph.urlToModuleMap.entries()) {
_logger.debug(`collectDevCss(nuxt=${nuxt},moduleGraph=${moduleGraph}): urls → ${urls}`);
_logger.debug(`collectDevCss(nuxt=${nuxt},moduleGraph=${moduleGraph}): files → ${files}`);
    if (!isCSS(url) || 'raw' in getQuery(url)) { continue }
    const importers = node.importers
    if (importers?.size && [...importers].every(i => i.id && 'raw' in getQuery(i.id))) { continue }
    urls.add(url)
    if (node.file) { files.add(node.file) }
  }

  for (const entry of resolveGlobalCss(nuxt)) {
    if (!files.has(entry.file)) { urls.add(entry.url) }
  }

_logger.debug(`<<< Exiting collectDevCss(nuxt=${nuxt},moduleGraph=${moduleGraph})`);
  return [...urls]
}
