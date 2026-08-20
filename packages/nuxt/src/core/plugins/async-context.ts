import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import type { Nuxt } from '@nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')
import { isVue } from '../utils/index.ts'

const WITH_ASYNC_CONTEXT_IMPORT_RE = /withAsyncContext as _withAsyncContext,?/

export const AsyncContextInjectionPlugin = (_nuxt: Nuxt) => createUnplugin(() => {
NuxtLogger.debug(`>>> Entering AsyncContextInjectionPlugin(_nuxt=${_nuxt})`);
  return {
    name: 'nuxt:vue-async-context',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isVue(id, { type: ['template', 'script'] })
    },
    transform: {
      filter: {
        code: { include: /_withAsyncContext/ },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
        const s = rolldownString(code, id, meta)
        s.prepend('import { withAsyncContext as _withAsyncContext } from "#app/composables/asyncContext";\n')
        const match = WITH_ASYNC_CONTEXT_IMPORT_RE.exec(code)
        if (match) {
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): match → ${match}`);
          s.remove(match.index, match.index + match[0].length)
        }
		NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
        return generateTransform(s, id)
      },
    },
  }
})
