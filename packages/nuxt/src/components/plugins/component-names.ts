import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { parseAndWalk } from 'oxc-walker'

import { SX_RE, isVue } from '../../core/utils/index.ts'
import type { Component } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

interface NameDevPluginOptions {
  getComponents: () => Component[]
}
const FILENAME_RE = /([^/\\]+)\.\w+$/
/**
 * Set the default name of components to their PascalCase name
 */
export const ComponentNamePlugin = (options: NameDevPluginOptions) => createUnplugin(() => {
NuxtLogger.error(`>>> Entering ComponentNamePlugin(options=${options})`, { "event.action": "ComponentNamePlugin", "logrite.options": options });
  return {
    name: 'nuxt:component-name-plugin',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      /* v8 ignore next 2 */
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return isVue(id) || !!id.match(SX_RE)
    },
    transform: {
      filter: {
        id: { include: FILENAME_RE },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const filename = id.match(FILENAME_RE)?.[1]
        if (!filename) {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): filename → ${filename}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          return
        }
        const component = options.getComponents().find(c => c.filePath === id)

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): component → ${component}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        if (!component) {
          return
        }

        const NAME_RE = new RegExp(`__name:\\s*['"]${filename}['"]`)
        const s = rolldownString(code, id, meta)
        const nameMatch = NAME_RE.exec(code)
        if (nameMatch) {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): NAME_RE → ${NAME_RE}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          s.overwrite(nameMatch.index, nameMatch.index + nameMatch[0].length, `__name: ${JSON.stringify(component.pascalName)}`)
        }

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): nameMatch → ${nameMatch}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        // Without setup function, vue compiler does not generate __name
		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        if (!nameMatch) {
          parseAndWalk(code, id, function (node) {
            if (node.type !== 'ExportDefaultDeclaration') {
              return
            }

            const { start, end } = node.declaration
            s.overwrite(start, end, `Object.assign(${code.slice(start, end)}, { __name: ${JSON.stringify(component.pascalName)} })`)
            this.skip()
          })
        }

        return generateTransform(s, id)
      },
    },
  }
})
