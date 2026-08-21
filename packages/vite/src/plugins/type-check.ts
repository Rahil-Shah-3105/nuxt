import { generateTransform, rolldownString } from 'rolldown-string'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { resolveClientEntry } from '../utils/config.ts'

const QUERY_RE = /\?.+$/

export function TypeCheckPlugin (nuxt: Nuxt): Plugin {
  let entry: string
  return {
    name: 'nuxt:type-check',
    applyToEnvironment: environment => environment.name === 'client' && !environment.config.isProduction,
    apply: () => {
	_logger.debug(`>>> Entering TypeCheckPlugin(nuxt=${nuxt})`);
	_logger.debug(`<<< Exiting TypeCheckPlugin(nuxt=${nuxt})`);
      return !nuxt.options.test && nuxt.options.typescript.typeCheck === true
    },
    configResolved (config) {
	_logger.debug(`>>> Entering configResolved(config=${config})`);
      try {
        entry = resolveClientEntry(config)
      } catch {
        console.debug('[nuxt:type-check] Could not resolve client entry, type checking will not be applied.')
      }
		_logger.debug(`<<< Exiting configResolved(config=${config})`);
    },
    transform (code, id, meta?: unknown) {
	_logger.debug(`>>> Entering transform(code=${code},id=${id},meta=${meta})`);
      if (id.replace(QUERY_RE, '') !== entry) { return }

      const s = rolldownString(code, id, meta)

	_logger.debug(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`);
      s.prepend('import "/@vite-plugin-checker-runtime-entry";\n')

	_logger.debug(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`);
      return generateTransform(s, id)
    },
  }
}
