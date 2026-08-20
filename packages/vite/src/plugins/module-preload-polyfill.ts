import { generateTransform, rolldownString } from 'rolldown-string'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { resolveClientEntry } from '../utils/config.ts'

const QUERY_RE = /\?.+$/

export function ModulePreloadPolyfillPlugin (): Plugin {
_logger.debug('>>> Entering ModulePreloadPolyfillPlugin()');
  let isDisabled = false
  let entry: string
  return {
    name: 'nuxt:module-preload-polyfill',
    applyToEnvironment: environment => environment.name === 'client',
    configResolved (config) {
	_logger.debug(`>>> Entering configResolved(config=${config})`);
      try {
        isDisabled = config.build.modulePreload === false || config.build.modulePreload.polyfill === false
        entry = resolveClientEntry(config)
      } catch {
        console.debug('[nuxt:module-preload-polyfill] Could not resolve client entry, module preload polyfill will not be injected.')
      }
		_logger.debug(`<<< Exiting configResolved(config=${config})`);
    },
    transform (code, id, meta?: unknown) {
	_logger.debug(`>>> Entering transform(code=${code},id=${id},meta=${meta})`);
      if (isDisabled || id.replace(QUERY_RE, '') !== entry) { return }

      const s = rolldownString(code, id, meta)

	_logger.debug(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`);
      s.prepend('import "vite/modulepreload-polyfill";\n')

	_logger.debug(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`);
      return generateTransform(s, id)
    },
  }
}
