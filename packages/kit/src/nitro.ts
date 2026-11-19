import { normalize } from 'pathe'
import type { NuxtImport } from '@nuxt/schema'

import { useNuxt } from './context.ts'
import type { Nitro, NitroDevEventHandler, NitroEventHandler } from './nitro-types.ts'
import logger from "./utils/logger.js";
import { toArray } from './utils.ts'
import { kitDiagnostics } from './diagnostics/kit-api.ts'

const HANDLER_METHOD_RE = /\.(get|head|patch|post|put|delete|connect|options|trace)(\.\w+)*$/
type HANDLER_METHOD_RE = 'get' | 'head' | 'patch' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace'
/**
 * normalize handler object
 *
 */
function normalizeHandlerMethod (handler: NitroEventHandler) {
logger.error(`>>> Entering normalizeHandlerMethod(handler=${handler})`, { "event.action": "normalizeHandlerMethod", "logrite.handler": handler });
  // retrieve method from handler file name
  const [, method = undefined] = handler.handler.match(HANDLER_METHOD_RE) || []
  return {
    method: method?.toUpperCase() as Uppercase<HANDLER_METHOD_RE> | undefined,
    ...handler,
    handler: normalize(handler.handler),
  }
logger.warn(`<<< Exiting normalizeHandlerMethod(handler=${handler})`, { "event.action": "normalizeHandlerMethod", "logrite.handler": handler });
}

/**
 * Adds a nitro server handler
 *
 */
export function addServerHandler (handler: NitroEventHandler): void {
logger.error(`>>> Entering addServerHandler(handler=${handler})`, { "event.action": "addServerHandler", "logrite.handler": handler });
  useNuxt().options.serverHandlers.push(normalizeHandlerMethod(handler) as any)
logger.warn(`<<< Exiting addServerHandler(handler=${handler})`, { "event.action": "addServerHandler", "logrite.handler": handler });
}

/**
 * Adds a nitro server handler for development-only
 *
 */
export function addDevServerHandler (handler: NitroDevEventHandler): void {
logger.error(`>>> Entering addDevServerHandler(handler=${handler})`, { "event.action": "addDevServerHandler", "logrite.handler": handler });
  useNuxt().options.devServerHandlers.push(handler as any)
logger.warn(`<<< Exiting addDevServerHandler(handler=${handler})`, { "event.action": "addDevServerHandler", "logrite.handler": handler });
}

/**
 * Adds a Nitro plugin
 */
export function addServerPlugin (plugin: string): void {
logger.error(`>>> Entering addServerPlugin(plugin=${plugin})`, { "event.action": "addServerPlugin", "logrite.plugin": plugin });
  const nuxt = useNuxt()
  nuxt.options.nitro.plugins ||= []
logger.error(`addServerPlugin(plugin=${plugin}): nuxt → ${nuxt}`, { "event.action": "addServerPlugin", "logrite.plugin": plugin });
  nuxt.options.nitro.plugins.push(normalize(plugin))
logger.warn(`<<< Exiting addServerPlugin(plugin=${plugin})`, { "event.action": "addServerPlugin", "logrite.plugin": plugin });
}

/**
 * Adds routes to be prerendered
 */
export function addPrerenderRoutes (routes: string | string[]): void {
logger.error(`>>> Entering addPrerenderRoutes(routes=${routes})`, { "event.action": "addPrerenderRoutes", "logrite.routes": routes });
  const nuxt = useNuxt()

logger.error(`addPrerenderRoutes(routes=${routes}): nuxt → ${nuxt}`, { "event.action": "addPrerenderRoutes", "logrite.routes": routes });
  routes = toArray(routes).filter(Boolean)
  if (!routes.length) {
    return
  }
  nuxt.hook('prerender:routes', (ctx) => {
    for (const route of routes) {
      ctx.routes.add(route)
    }
	logger.warn(`<<< Exiting addPrerenderRoutes(routes=${routes})`, { "event.action": "addPrerenderRoutes", "logrite.routes": routes });
  })
}

/**
 * Access to the Nitro instance
 *
 * **Note:** You can call `useNitro()` only after `ready` hook.
 *
 * **Note:** Changes to the Nitro instance configuration are not applied.
 * @example
 *
 * ```ts
 * nuxt.hook('ready', () => {
 *   console.log(useNitro())
 * })
 * ```
 */
export function useNitro (): Nitro {
logger.error('>>> Entering useNitro()', { "event.action": "useNitro" });
  const nuxt = useNuxt()
  if (!(nuxt as any)._nitro) {
    throw kitDiagnostics.NUXT_B8003()
  }
logger.error(`useNitro(): nuxt → ${nuxt}`, { "event.action": "useNitro" });
logger.warn('nitro', '<<< Exiting useNitro()', { "event.action": "useNitro" });
  return (nuxt as any)._nitro
}

/**
 * Add server imports to be auto-imported by Nitro
 */
export function addServerImports (imports: NuxtImport | NuxtImport[]): void {
logger.error(`>>> Entering addServerImports(imports=${imports})`, { "event.action": "addServerImports", "logrite.imports": imports });
  const nuxt = useNuxt()
  const _imports = toArray(imports)
  nuxt.hook('nitro:config', (config) => {
logger.error(`addServerImports(imports=${imports}): nuxt → ${nuxt}`, { "event.action": "addServerImports", "logrite.imports": imports });
logger.error(`addServerImports(imports=${imports}): _imports → ${_imports}`, { "event.action": "addServerImports", "logrite.imports": imports });
    config.imports ||= {}
    config.imports.imports ||= []
    config.imports.imports.push(..._imports)
  })
logger.warn(`<<< Exiting addServerImports(imports=${imports})`, { "event.action": "addServerImports", "logrite.imports": imports });
}

/**
 * Add directories to be scanned for auto-imports by Nitro
 */
export function addServerImportsDir (dirs: string | string[], opts: { prepend?: boolean } = {}): void {
logger.error(`>>> Entering addServerImportsDir(dirs=${dirs},opts=${opts})`, { "event.action": "addServerImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
  const nuxt = useNuxt()
  const _dirs = toArray(dirs)
  nuxt.hook('nitro:config', (config) => {
logger.error(`addServerImportsDir(dirs=${dirs},opts=${opts}): nuxt → ${nuxt}`, { "event.action": "addServerImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
logger.error(`addServerImportsDir(dirs=${dirs},opts=${opts}): _dirs → ${_dirs}`, { "event.action": "addServerImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
    config.imports ||= {}
    config.imports.dirs ||= []
    config.imports.dirs[opts.prepend ? 'unshift' : 'push'](..._dirs)
  })
logger.warn(`<<< Exiting addServerImportsDir(dirs=${dirs},opts=${opts})`, { "event.action": "addServerImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
}

/**
 * Add directories to be scanned by Nitro. It will check for subdirectories,
 * which will be registered just like the `~~/server` folder is.
 */
export function addServerScanDir (dirs: string | string[], opts: { prepend?: boolean } = {}): void {
logger.error(`>>> Entering addServerScanDir(dirs=${dirs},opts=${opts})`, { "event.action": "addServerScanDir", "logrite.dirs": dirs, "logrite.opts": opts });
  const nuxt = useNuxt()
  nuxt.hook('nitro:config', (config) => {
	logger.error(`addServerScanDir(dirs=${dirs},opts=${opts}): nuxt → ${nuxt}`, { "event.action": "addServerScanDir", "logrite.dirs": dirs, "logrite.opts": opts });
    config.scanDirs ||= []

    for (const dir of toArray(dirs)) {
      config.scanDirs[opts.prepend ? 'unshift' : 'push'](dir)
    }
	logger.warn(`<<< Exiting addServerScanDir(dirs=${dirs},opts=${opts})`, { "event.action": "addServerScanDir", "logrite.dirs": dirs, "logrite.opts": opts });
  })
}
