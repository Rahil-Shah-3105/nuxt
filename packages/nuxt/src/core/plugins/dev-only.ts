import { generateTransform, rolldownString } from 'rolldown-string'
import { createUnplugin } from 'unplugin'
import { parse } from 'ultrahtml'
import type { Node } from 'ultrahtml'
export const logger: NuxtLogger = useLogger('nuxt')
import { isVue } from '../utils/index.ts'

const DEVONLY_COMP_SINGLE_RE = /<(?:dev-only|DevOnly|lazy-dev-only|LazyDevOnly)(?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?>[\s\S]*?<\/(?:dev-only|DevOnly|lazy-dev-only|LazyDevOnly)>/
const DEVONLY_COMP_RE = /<(?:dev-only|DevOnly|lazy-dev-only|LazyDevOnly)(?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?>[\s\S]*?<\/(?:dev-only|DevOnly|lazy-dev-only|LazyDevOnly)>/g

export const DevOnlyPlugin = () => createUnplugin(() => {
NuxtLogger.error('>>> Entering DevOnlyPlugin()', { "event.action": "DevOnlyPlugin" });
  return {
    name: 'nuxt:server-devonly:transform',
    enforce: 'pre',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return isVue(id, { type: ['template'] })
    },
    transform: {
      filter: {
        code: { include: DEVONLY_COMP_SINGLE_RE },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)
        for (const match of code.matchAll(DEVONLY_COMP_RE)) {
          const ast: Node = parse(match[0]).children[0]
          const fallback: Node | undefined = ast.children?.find((n: Node) => {
            if (n.name !== 'template') { return false }
            return 'fallback' in n.attributes || '#fallback' in n.attributes || 'v-slot:fallback' in n.attributes
          })
          const replacement = fallback ? match[0].slice(fallback.loc[0].end, fallback.loc.at(-1).start) : ''
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): replacement → ${replacement}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          s.overwrite(match.index!, match.index! + match[0].length, replacement)
        }

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
