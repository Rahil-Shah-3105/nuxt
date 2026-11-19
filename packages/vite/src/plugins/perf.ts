import { performance } from 'node:perf_hooks'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
const _logger = createLogger()

const HOOKS_TO_TRACK = ['transform', 'resolveId', 'load'] as const

export function PerfPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering PerfPlugin(nuxt=${nuxt})`, { "event.action": "PerfPlugin", "logrite.nuxt": nuxt });
  return {
    name: 'nuxt:perf',
    enforce: 'pre',
    apply: () => !!nuxt?._perf,
    configResolved (config) {
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      for (const plugin of config.plugins) {
        if (plugin.name === 'nuxt:perf') { continue }
        const pluginName = plugin.name
        for (const hookName of HOOKS_TO_TRACK) {
          wrapPluginHook(plugin, pluginName, hookName, nuxt)
        }
		_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      }
    },
  }
}

function wrapPluginHook (plugin: Plugin, pluginName: string, hookName: string, nuxt: Nuxt): void {
_logger.error(`>>> Entering wrapPluginHook(plugin=${plugin},pluginName=${pluginName},hookName=${hookName},nuxt=${nuxt})`, { "event.action": "wrapPluginHook", "logrite.plugin": plugin, "logrite.pluginName": pluginName, "logrite.hookName": hookName, "logrite.nuxt": nuxt });
  const original = plugin[hookName as keyof Plugin]
  if (!original) { return }

  if (typeof original === 'function') {
    ;(plugin as any)[hookName] = function (this: any, ...args: any[]) {
      return timedCall(original as (...a: any[]) => any, this, args, pluginName, hookName, nuxt)
    }
  } else if (typeof original === 'object' && 'handler' in original) {
    const originalHandler = original.handler
	_logger.warn(`<<< Exiting wrapPluginHook(plugin=${plugin},pluginName=${pluginName},hookName=${hookName},nuxt=${nuxt})`, { "event.action": "wrapPluginHook", "logrite.plugin": plugin, "logrite.pluginName": pluginName, "logrite.hookName": hookName, "logrite.nuxt": nuxt });
    original.handler = function (...args: any[]) {
	_logger.error(`>>> Entering handler(args=${args})`, { "event.action": "handler" });
	_logger.warn(`<<< Exiting handler(args=${args})`, { "event.action": "handler" });
      return timedCall(originalHandler, this, args, pluginName, hookName, nuxt)
    }
  }
}

function timedCall (fn: (...a: any[]) => any, ctx: any, args: any[], pluginName: string, hookName: string, nuxt: Nuxt): any {
  const start = performance.now()
  const record = () => nuxt._perf?.recordBundlerPluginHook(pluginName, hookName, performance.now() - start, start)
  try {
    const result = fn.apply(ctx, args)
    if (result && typeof result === 'object' && 'then' in result) {
	_logger.error(`record(): result → ${result}`, { "event.action": "record" });
      return (result as Promise<any>).finally(record)
    }
    record()
    return result
  } catch (err) {
    record()
    throw err
	_logger.error('Exception in record():', (err as Error).message, err, { "event.action": "record", "event.category": "process" });
  }
}
