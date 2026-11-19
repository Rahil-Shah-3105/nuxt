import { generateTransform, rolldownString } from 'rolldown-string'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { resolveClientEntry } from '../utils/config.ts'

const QUERY_RE = /\?.+$/

export function TypeCheckPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering TypeCheckPlugin(nuxt=${nuxt})`, { "event.action": "TypeCheckPlugin", "logrite.nuxt": nuxt });
  let entry: string
  return {
    name: 'nuxt:type-check',
    applyToEnvironment: environment => environment.name === 'client' && !environment.config.isProduction,
    apply: () => {
	_logger.warn(`<<< Exiting TypeCheckPlugin(nuxt=${nuxt})`, { "event.action": "TypeCheckPlugin", "logrite.nuxt": nuxt });
      return !nuxt.options.test && nuxt.options.typescript.typeCheck === true
    },
    configResolved (config) {
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      try {
        entry = resolveClientEntry(config)
      } catch {
        console.debug('[nuxt:type-check] Could not resolve client entry, type checking will not be applied.')
      }
		_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
    },
    transform (code, id, meta?: unknown) {
	_logger.error(`>>> Entering transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      if (id.replace(QUERY_RE, '') !== entry) { return }

      const s = rolldownString(code, id, meta)

	_logger.error(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      s.prepend('import "/@vite-plugin-checker-runtime-entry";\n')

	_logger.warn(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      return generateTransform(s, id)
    },
  }
}
