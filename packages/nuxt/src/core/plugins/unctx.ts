import type { Transformer, TransformerOptions } from 'unctx/transform'
export const logger: NuxtLogger = useLogger('nuxt')
import { createTransformer, getTransformFilter } from 'unctx/transform'
import { createUnplugin } from 'unplugin'

import { isJS, isVue } from '../utils/index.ts'

const TRANSFORM_MARKER = '/* _processed_nuxt_unctx_transform */\n'
const TRANSFORM_MARKER_RE = /^\/\* _processed_nuxt_unctx_transform \*\/\n/

interface UnctxTransformPluginOptions {
  sourcemap?: boolean
  transformerOptions: TransformerOptions
}

export const UnctxTransformPlugin = (options: UnctxTransformPluginOptions) => createUnplugin(() => {
NuxtLogger.debug(`>>> Entering UnctxTransformPlugin(options=${options})`);
  let transformer: Promise<Transformer> | undefined
  const filter = getTransformFilter(options.transformerOptions)

  return {
    name: 'unctx:transform',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isVue(id, { type: ['template', 'script'] }) || isJS(id)
    },
    transform: {
      filter: {
        ...filter,
        code: {
          include: filter.code,
          exclude: TRANSFORM_MARKER_RE,
        },
      },
      async handler (code) {
		NuxtLogger.debug(`>>> Entering handler(code=${code})`);
        const { shouldTransform, transform } = await (transformer ??= createTransformer(options.transformerOptions))
        // TODO: needed for webpack - update transform in unctx/unplugin?
        if (!shouldTransform(code)) { return }
        const result = transform(code)
        if (result) {
		NuxtLogger.debug(`handler(code=${code}): result → ${result}`);
          result.magicString.prepend(TRANSFORM_MARKER)
          return {
            code: result.magicString.toString(),
            map: options.sourcemap
              ? result.magicString.generateMap({ hires: true })
              : undefined,
          }
		NuxtLogger.debug(`<<< Exiting handler(code=${code})`);
        }
      },
    },
  }
})
