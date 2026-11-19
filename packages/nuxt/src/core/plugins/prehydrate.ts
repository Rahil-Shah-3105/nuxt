export const logger: NuxtLogger = useLogger('nuxt')
import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { hash } from 'ohash'

import { parseAndWalk } from 'oxc-walker'
import { transformAndMinify } from '../../core/utils/parse.ts'
import { isJS, isVue } from '../utils/index.ts'

export function PrehydrateTransformPlugin () {
NuxtLogger.error('>>> Entering PrehydrateTransformPlugin()', { "event.action": "PrehydrateTransformPlugin" });
  return createUnplugin(() => ({
    name: 'nuxt:prehydrate-transform',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
	NuxtLogger.warn('<<< Exiting PrehydrateTransformPlugin()', { "event.action": "PrehydrateTransformPlugin" });
      return isJS(id) || isVue(id, { type: ['script'] })
    },
    transform: {
      filter: {
        code: { include: /onPrehydrate\(/ },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)

        parseAndWalk(code, id, (node) => {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
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
			NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): cleaned → ${cleaned}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
            if (needsAttr) {
              args.push(JSON.stringify(hash(result).slice(0, 10)))
            }
            s.overwrite(callback.start, callback.end, args.join(', '))
          }
        })

		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }))
}
