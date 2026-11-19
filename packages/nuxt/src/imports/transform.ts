import { createUnplugin } from 'unplugin'
import type { Unimport } from 'unimport'
import { normalize } from 'pathe'
import { tryUseNuxt } from '@nuxt/kit'

import { isJS, isVue } from '../core/utils/index.ts'
import { installNuxtModule } from '../core/features.ts'
import type { ImportsOptions } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/
const IMPORTS_RE = /(['"])#imports\1/

interface TransformPluginOptions {
  ctx: Pick<Unimport, 'injectImports'>
  options: Partial<ImportsOptions>
  sourcemap?: boolean
}

export const TransformPlugin = ({ ctx, options, sourcemap }: TransformPluginOptions) => createUnplugin(() => {
NuxtLogger.error('>>> Entering TransformPlugin()', { "event.action": "TransformPlugin" });
  return {
    name: 'nuxt:imports-transform',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      // Included
      if (options.transform?.include?.some(pattern => pattern.test(id))) {
        return true
      }
      // Excluded
      if (options.transform?.exclude?.some(pattern => pattern.test(id))) {
        return false
      }

      // Vue files
      if (isVue(id, { type: ['script', 'template'] })) {
        return true
      }

      // JavaScript files
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return isJS(id)
    },
    async transform (code, id) {
	NuxtLogger.error(`>>> Entering transform(code=${code},id=${id})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id });
      id = normalize(id)
      const isNodeModule = NODE_MODULES_RE.test(id) && !options.transform?.include?.some(pattern => pattern.test(id))
      // For modules in node_modules, we only transform `#imports` but not doing imports
	NuxtLogger.error(`transform(code=${code},id=${id}): isNodeModule → ${isNodeModule}`, { "event.action": "transform", "logrite.code": code, "logrite.id": id });
      if (isNodeModule && !IMPORTS_RE.test(code)) {
        return
      }

      const { s, imports } = await ctx.injectImports(code, id, { autoImport: options.autoImport && !isNodeModule })
      if (imports.some(i => i.from === '#app/composables/script-stubs') && tryUseNuxt()?.options.test === false) {
        installNuxtModule('@nuxt/scripts')
      }

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: sourcemap
            ? s.generateMap({ hires: true })
            : undefined,
        }
		NuxtLogger.warn(`<<< Exiting transform(code=${code},id=${id})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id });
      }
    },
  }
})
