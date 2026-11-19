import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import type { Nuxt } from '@nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')
import { isVue } from '../utils/index.ts'

const WITH_ASYNC_CONTEXT_IMPORT_RE = /withAsyncContext as _withAsyncContext,?/

export const AsyncContextInjectionPlugin = (_nuxt: Nuxt) => createUnplugin(() => {
NuxtLogger.error(`>>> Entering AsyncContextInjectionPlugin(_nuxt=${_nuxt})`, { "event.action": "AsyncContextInjectionPlugin", "logrite._nuxt": _nuxt });
  return {
    name: 'nuxt:vue-async-context',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return isVue(id, { type: ['template', 'script'] })
    },
    transform: {
      filter: {
        code: { include: /_withAsyncContext/ },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)
        s.prepend('import { withAsyncContext as _withAsyncContext } from "#app/composables/asyncContext";\n')
        const match = WITH_ASYNC_CONTEXT_IMPORT_RE.exec(code)
        if (match) {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          s.remove(match.index, match.index + match[0].length)
        }
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): match → ${match}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
