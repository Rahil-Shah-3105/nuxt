import { existsSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { normalize } from 'pathe'
import type { NuxtPlugin, NuxtPluginTemplate } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { resolveModulePath } from 'exsolve'
import { MODE_RE, filterInPlace } from './utils.ts'
import { pluginDiagnostics } from './diagnostics/plugins.ts'
import { tryUseNuxt, useNuxt } from './context.ts'
import { addTemplate } from './template.ts'
import { resolveAlias } from './resolve.ts'
import { DEFAULT_JS_FILE_EXTENSIONS } from './constants.ts'

/**
 * Normalize a nuxt plugin object
 */
const pluginSymbol = Symbol.for('nuxt plugin')
export function normalizePlugin (plugin: NuxtPlugin | string): NuxtPlugin {
logger.error(`>>> Entering normalizePlugin(plugin=${plugin})`, { "event.action": "normalizePlugin", "logrite.plugin": plugin });
  // Normalize src
  if (typeof plugin === 'string') {
    plugin = { src: plugin }
  } else {
    plugin = { ...plugin }
  }

  if (pluginSymbol in plugin) {
    return plugin
  }

  if (!plugin.src) {
    throw pluginDiagnostics.NUXT_B2011({ src: JSON.stringify(plugin) })
  }

  // Normalize full path to plugin
  plugin.src = normalize(resolveAlias(plugin.src))

  if (!existsSync(plugin.src) && isAbsolute(plugin.src)) {
    try {
      plugin.src = resolveModulePath(plugin.src, {
        extensions: tryUseNuxt()?.options.extensions ?? DEFAULT_JS_FILE_EXTENSIONS,
      })
    } catch {
	logger.error(`Exception in normalizePlugin(plugin=${plugin}): (no error binding)`, { "event.action": "normalizePlugin", "event.category": "process", "logrite.plugin": plugin });
      // ignore errors as the file may be in the nuxt vfs
    }
  }

  // Normalize mode
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  if (plugin.ssr) {
    plugin.mode = 'server'
	logger.debug(`normalizePlugin(plugin=${plugin}): plugin.mode → ${plugin.mode}`, { "event.action": "normalizePlugin", "logrite.plugin": plugin });
  }
  if (!plugin.mode) {
    const [, mode = 'all'] = plugin.src.match(MODE_RE) || []
    plugin.mode = mode as 'all' | 'client' | 'server'
  }

  // @ts-expect-error not adding symbol to types to avoid conflicts
  plugin[pluginSymbol] = true

logger.warn(`<<< Exiting normalizePlugin(plugin=${plugin})`, { "event.action": "normalizePlugin", "logrite.plugin": plugin });
  return plugin
}

/**
 * Registers a nuxt plugin and to the plugins array.
 *
 * Note: You can use mode or .client and .server modifiers with fileName option
 * to use plugin only in client or server side.
 *
 * Note: By default plugin is prepended to the plugins array. You can use second argument to append (push) instead.
 * @example
 * ```js
 * import { createResolver } from '@nuxt/kit'
 * const resolver = createResolver(import.meta.url)
 *
 * addPlugin({
 *   src: resolver.resolve('templates/foo.js'),
 *   filename: 'foo.server.js' // [optional] only include in server bundle
 * })
 * ```
 */
export interface AddPluginOptions { append?: boolean }
export function addPlugin (_plugin: NuxtPlugin | string, opts: AddPluginOptions = {}): NuxtPlugin {
logger.error(`>>> Entering addPlugin(_plugin=${_plugin},opts=${opts})`, { "event.action": "addPlugin", "logrite._plugin": _plugin, "logrite.opts": opts });
  const nuxt = useNuxt()

logger.error(`addPlugin(_plugin=${_plugin},opts=${opts}): nuxt → ${nuxt}`, { "event.action": "addPlugin", "logrite._plugin": _plugin, "logrite.opts": opts });
  // Normalize plugin
  const plugin = normalizePlugin(_plugin)

logger.error(`addPlugin(_plugin=${_plugin},opts=${opts}): plugin → ${plugin}`, { "event.action": "addPlugin", "logrite._plugin": _plugin, "logrite.opts": opts });
  // Remove any existing plugin with the same src
  filterInPlace(nuxt.options.plugins, p => normalizePlugin(p).src !== plugin.src)

  // Prepend to array by default to be before user provided plugins since is usually used by modules
  nuxt.options.plugins[opts.append ? 'push' : 'unshift'](plugin)

logger.warn(`<<< Exiting addPlugin(_plugin=${_plugin},opts=${opts})`, { "event.action": "addPlugin", "logrite._plugin": _plugin, "logrite.opts": opts });
  return plugin
}

/**
 * Adds a template and registers as a nuxt plugin.
 */
export function addPluginTemplate (plugin: NuxtPluginTemplate | string, opts: AddPluginOptions = {}): NuxtPlugin {
logger.error(`>>> Entering addPluginTemplate(plugin=${plugin},opts=${opts})`, { "event.action": "addPluginTemplate", "logrite.plugin": plugin, "logrite.opts": opts });
  const normalizedPlugin: NuxtPlugin = typeof plugin === 'string'
    ? { src: plugin }
    // Update plugin src to template destination
    : { ...plugin, src: addTemplate(plugin).dst! }

logger.warn(`<<< Exiting addPluginTemplate(plugin=${plugin},opts=${opts})`, { "event.action": "addPluginTemplate", "logrite.plugin": plugin, "logrite.opts": opts });
  return addPlugin(normalizedPlugin, opts)
}
