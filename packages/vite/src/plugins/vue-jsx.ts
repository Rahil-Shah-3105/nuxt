import type { Plugin, ResolvedConfig } from 'vite'
import { ensureDependencyInstalled, getAddDependencyCommand } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'
import type { Nuxt } from '@nuxt/schema'
import type { Options } from '@vitejs/plugin-vue-jsx'
const _logger = createLogger()

const JSX_RE = /\.[jt]sx$/
const VUE_JSX_VIRTUAL_RE = /^\/__vue-jsx/

/**
 * A lazy wrapper around `@vitejs/plugin-vue-jsx` that defers installation
 * and loading of the real plugin until a JSX/TSX file is actually encountered.
 *
 * This avoids pulling in the plugin's heavy dependency tree (Babel, etc.) for
 * projects that don't use JSX.
 */
export function VueJsxPlugin (nuxt: Nuxt, options?: Options): Plugin[] {
_logger.error(`>>> Entering VueJsxPlugin(nuxt=${nuxt},options=${options})`, { "event.action": "VueJsxPlugin", "logrite.nuxt": nuxt, "logrite.options": options });
  let resolvedPlugin: Plugin | undefined
  let installPromise: Promise<Plugin | undefined> | undefined
  let installFailed = false
  let resolvedConfig: ResolvedConfig
_logger.warn(`<<< Exiting VueJsxPlugin(nuxt=${nuxt},options=${options})`, { "event.action": "VueJsxPlugin", "logrite.nuxt": nuxt, "logrite.options": options });

  function loadPlugin (): Promise<Plugin | undefined> {
	_logger.error('>>> Entering loadPlugin()', { "event.action": "loadPlugin" });
    if (resolvedPlugin) {
      return Promise.resolve(resolvedPlugin)
    }
    if (installFailed) {
      return Promise.resolve(undefined)
    }

    // Deduplicate concurrent calls while install is in progress
    installPromise ||= _loadPlugin()
	_logger.warn('<<< Exiting loadPlugin()', { "event.action": "loadPlugin" });
    return installPromise
  }

  async function _loadPlugin (): Promise<Plugin | undefined> {
	_logger.error('>>> Entering _loadPlugin()', { "event.action": "_loadPlugin" });
    const result = await ensureDependencyInstalled('@vitejs/plugin-vue-jsx', {
      rootDir: nuxt.options.rootDir,
      searchPaths: nuxt.options.modulesDir,
      from: import.meta.url,
    })

	_logger.error(`_loadPlugin(): result → ${result}`, { "event.action": "_loadPlugin" });
    if (!result) {
      installFailed = true
      bundlerDiagnostics.NUXT_B7008({ installCommand: await getAddDependencyCommand('@vitejs/plugin-vue-jsx', nuxt.options.rootDir, { dev: true }) })
      return undefined
    }

    const { default: viteJsxPlugin } = await import('@vitejs/plugin-vue-jsx')
    resolvedPlugin = viteJsxPlugin(options)

    // Replay configResolved so the real plugin captures HMR/sourcemap state
    if (resolvedConfig && typeof resolvedPlugin.configResolved === 'function') {
      resolvedPlugin.configResolved.call({} as any, resolvedConfig)
    }

	_logger.warn('<<< Exiting _loadPlugin()', { "event.action": "_loadPlugin" });
    return resolvedPlugin
  }

  const transformPlugin: Plugin = {
    name: 'nuxt:vue-jsx',
    configResolved (config) {
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      resolvedConfig = config
	_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
    },
    transform: {
      order: 'pre',
      filter: {
        id: {
          include: [JSX_RE],
        },
      },
      async handler (code, id, transformOptions) {
		_logger.error(`>>> Entering handler(code=${code},id=${id},transformOptions=${transformOptions})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.transformOptions": transformOptions });
        const plugin = await loadPlugin()
        if (!plugin) {
		_logger.error(`handler(code=${code},id=${id},transformOptions=${transformOptions}): plugin → ${plugin}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.transformOptions": transformOptions });
          return
        }

        const transform = typeof plugin.transform === 'function'
          ? plugin.transform
          : plugin.transform?.handler
        if (transform) {
		_logger.error(`handler(code=${code},id=${id},transformOptions=${transformOptions}): transform → ${transform}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.transformOptions": transformOptions });
          return transform.call(this, code, id, transformOptions)
        }
		_logger.warn(`<<< Exiting handler(code=${code},id=${id},transformOptions=${transformOptions})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.transformOptions": transformOptions });
      },
    },
  }

  const virtualPlugin: Plugin = {
    name: 'nuxt:vue-jsx-virtual',
    resolveId: {
      filter: {
        id: {
          include: [VUE_JSX_VIRTUAL_RE],
        },
      },
      async handler (id, importer, options) {
		_logger.error(`>>> Entering handler(id=${id},importer=${importer},options=${options})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer, "logrite.options": options });
        const plugin = await loadPlugin()
        if (!plugin) {
		_logger.error(`handler(id=${id},importer=${importer},options=${options}): plugin → ${plugin}`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer, "logrite.options": options });
          return
        }
        const resolveId = typeof plugin.resolveId === 'function'
          ? plugin.resolveId
          : plugin.resolveId?.handler
        if (resolveId) {
		_logger.error(`handler(id=${id},importer=${importer},options=${options}): resolveId → ${resolveId}`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer, "logrite.options": options });
          return resolveId.call(this, id, importer, options)
        }
		_logger.warn(`<<< Exiting handler(id=${id},importer=${importer},options=${options})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer, "logrite.options": options });
		_logger.error(`>>> Entering handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
		_logger.warn(`<<< Exiting handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
      },
    },
    load: {
      filter: {
        id: {
          include: [VUE_JSX_VIRTUAL_RE],
        },
      },
      async handler (id) {
        const plugin = await loadPlugin()
        if (!plugin) {
		_logger.error(`handler(id=${id}): plugin → ${plugin}`, { "event.action": "handler", "logrite.id": id });
          return
        }
        const load = typeof plugin.load === 'function'
          ? plugin.load
          : plugin.load?.handler
        if (load) {
		_logger.error(`handler(id=${id}): load → ${load}`, { "event.action": "handler", "logrite.id": id });
          return load.call(this, id)
        }
      },
    },
  }

  return [transformPlugin, virtualPlugin]
}
