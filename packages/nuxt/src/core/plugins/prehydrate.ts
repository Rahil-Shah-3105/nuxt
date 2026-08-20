export const logger: NuxtLogger = useLogger('nuxt')
import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { hash } from 'ohash'

import { parseAndWalk } from 'oxc-walker'
import { transformAndMinify } from '../../core/utils/parse.ts'
import { isJS, isVue } from '../utils/index.ts'

export function PrehydrateTransformPlugin () {
NuxtLogger.debug('>>> Entering PrehydrateTransformPlugin()');
  return createUnplugin(() => ({
    name: 'nuxt:prehydrate-transform',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
	NuxtLogger.debug('<<< Exiting PrehydrateTransformPlugin()');
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isJS(id) || isVue(id, { type: ['script'] })
    },
    transform: {
      filter: {
        code: { include: /onPrehydrate\(/ },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
        const s = rolldownString(code, id, meta)

        parseAndWalk(code, id, (node) => {
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
          if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
            return
          }
          if (node.callee.name === 'onPrehydrate') {
            const callback = node.arguments[0]
            if (!callback) { return }
            if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') { return }

            const needsAttr = callback.params.length > 0
            const { code: result } = transformAndMinify(`forEach(${code.slice(callback.start, callback.end)})`, { lang: 'ts' })
            const cleaned = result.slice('forEach'.length).replace(/;$/, '')
            const args = [JSON.stringify(cleaned)]
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): cleaned → ${cleaned}`);
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): args → ${args}`);
            if (needsAttr) {
              args.push(JSON.stringify(hash(result).slice(0, 10)))
            }
            s.overwrite(callback.start, callback.end, args.join(', '))
          }
        })

		NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
        return generateTransform(s, id)
      },
    },
  }))
}
