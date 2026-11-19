import { generateTransform, rolldownString } from 'rolldown-string'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { resolveClientEntry } from '../utils/config.ts'

const QUERY_RE = /\?.+$/

export function ModulePreloadPolyfillPlugin (): Plugin {
_logger.error('>>> Entering ModulePreloadPolyfillPlugin()', { "event.action": "ModulePreloadPolyfillPlugin" });
  let isDisabled = false
  let entry: string
  return {
    name: 'nuxt:module-preload-polyfill',
    applyToEnvironment: environment => environment.name === 'client',
    configResolved (config) {
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      try {
        isDisabled = config.build.modulePreload === false || config.build.modulePreload.polyfill === false
        entry = resolveClientEntry(config)
      } catch {
        console.debug('[nuxt:module-preload-polyfill] Could not resolve client entry, module preload polyfill will not be injected.')
      }
		_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
    },
    transform (code, id, meta?: unknown) {
	_logger.error(`>>> Entering transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      if (isDisabled || id.replace(QUERY_RE, '') !== entry) { return }

      const s = rolldownString(code, id, meta)

	_logger.error(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      s.prepend('import "vite/modulepreload-polyfill";\n')

	_logger.warn(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      return generateTransform(s, id)
    },
  }
}
