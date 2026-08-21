import { performance } from 'node:perf_hooks'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
const _logger = createLogger()

const HOOKS_TO_TRACK = ['transform', 'resolveId', 'load'] as const

export function PerfPlugin (nuxt: Nuxt): Plugin {
_logger.debug(`>>> Entering PerfPlugin(nuxt=${nuxt})`);
  return {
    name: 'nuxt:perf',
    enforce: 'pre',
    apply: () => !!nuxt?._perf,
    configResolved (config) {
	_logger.debug(`>>> Entering configResolved(config=${config})`);
      for (const plugin of config.plugins) {
        if (plugin.name === 'nuxt:perf') { continue }
        const pluginName = plugin.name
        for (const hookName of HOOKS_TO_TRACK) {
          wrapPluginHook(plugin, pluginName, hookName, nuxt)
        }
		_logger.debug(`<<< Exiting configResolved(config=${config})`);
      }
    },
  }
}

function wrapPluginHook (plugin: Plugin, pluginName: string, hookName: string, nuxt: Nuxt): void {
  const original = plugin[hookName as keyof Plugin]
  if (!original) { return }

  if (typeof original === 'function') {
	_logger.debug(`>>> Entering wrapPluginHook(plugin=${plugin},pluginName=${pluginName},hookName=${hookName},nuxt=${nuxt})`);
    ;(plugin as any)[hookName] = function (this: any, ...args: any[]) {
	_logger.debug(`>>> Entering function(any=${any})`);
	_logger.debug(`<<< Exiting function(any=${any})`);
      return timedCall(original as (...a: any[]) => any, this, args, pluginName, hookName, nuxt)
	_logger.debug(`<<< Exiting wrapPluginHook(plugin=${plugin},pluginName=${pluginName},hookName=${hookName},nuxt=${nuxt})`);
    }
  } else if (typeof original === 'object' && 'handler' in original) {
    const originalHandler = original.handler
    original.handler = function (...args: any[]) {
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
	_logger.debug(`record(): result → ${result}`);
      return (result as Promise<any>).finally(record)
    }
    record()
    return result
  } catch (err) {
    record()
    throw err
	_logger.error('Exception in record():', (err as Error).message, err);
  }
}
