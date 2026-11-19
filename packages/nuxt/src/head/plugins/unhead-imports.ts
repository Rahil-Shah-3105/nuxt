import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import type { Identifier, ImportSpecifier } from 'estree'
export const logger: NuxtLogger = useLogger('nuxt')
import { normalize, relative } from 'pathe'
import { unheadVueComposablesImports } from '@unhead/vue'
import { genImport } from 'knitwork'
import { parseAndWalk } from 'oxc-walker'
import { headDiagnostics } from '@nuxt/kit/internal'
import { link } from 'clickable-path'
import { isJS, isVue } from '../../core/utils/index.ts'
import { distDir } from '../../dirs.ts'

interface UnheadImportsPluginOptions {
  rootDir: string
}

const UNHEAD_LIB_RE = /node_modules[/\\](?:@unhead[/\\][^/\\]+|unhead)[/\\]/
const NUXT_HEAD_RE = /node_modules[/\\]nuxt[/\\]dist[/\\]head[/\\]runtime[/\\]/

function toImports (specifiers: ImportSpecifier[]) {
NuxtLogger.error(`>>> Entering toImports(specifiers=${specifiers})`, { "event.action": "toImports", "logrite.specifiers": specifiers });
NuxtLogger.warn(`<<< Exiting toImports(specifiers=${specifiers})`, { "event.action": "toImports", "logrite.specifiers": specifiers });
  return specifiers.map((specifier) => {
    const imported = specifier.imported as Identifier | null
    const isNamedImport = imported && imported.name !== specifier.local.name
    return isNamedImport ? `${imported.name} as ${specifier.local.name}` : specifier.local.name
  })
}

const UnheadVue = '@unhead/vue'
const UnheadVueRE = /@unhead\/vue/

/**
 * To use composable in an async context we need to pass Nuxt context to the Unhead composables.
 *
 * We swap imports from @unhead/vue to #app/composables/head and warn users for type safety.
 */
export const UnheadImportsPlugin = (options: UnheadImportsPluginOptions) => createUnplugin(() => {
NuxtLogger.error(`>>> Entering UnheadImportsPlugin(options=${options})`, { "event.action": "UnheadImportsPlugin", "logrite.options": options });
  return {
    name: 'nuxt:head:unhead-imports',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      id = normalize(id)
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return (
        (isJS(id) || isVue(id, { type: ['script'] })) &&
        !id.startsWith('virtual:') &&
        !id.startsWith(normalize(distDir)) &&
        !UNHEAD_LIB_RE.test(id) &&
        !NUXT_HEAD_RE.test(id)
      )
    },
    transform: {
      filter: {
        code: { include: UnheadVueRE },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)
        const importsToAdd: ImportSpecifier[] = []
        parseAndWalk(code, id, function (node) {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          if (node.type === 'ImportDeclaration' && [UnheadVue, '#app/composables/head'].includes(String(node.source.value))) {
            importsToAdd.push(...node.specifiers as ImportSpecifier[])
            const { start, end } = node
            s.remove(start, end)
          }
        })

        const importsFromUnhead = importsToAdd.filter(specifier => unheadVueComposablesImports[UnheadVue].includes((specifier.imported as Identifier)?.name))
        const importsFromHead = importsToAdd.filter(specifier => !unheadVueComposablesImports[UnheadVue].includes((specifier.imported as Identifier)?.name))
        if (importsFromUnhead.length) {
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): importsFromUnhead → ${importsFromUnhead}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
          // warn if user has imported from @unhead/vue themselves
          if (!normalize(id).includes('node_modules')) {
            headDiagnostics.NUXT_B6001({ module: UnheadVue, file: link(normalize(id), { cwd: options.rootDir, formatter: absolute => `./${relative(normalize(options.rootDir), absolute)}` }) })
          }
          s.prepend(`${genImport('#app/composables/head', toImports(importsFromUnhead))}\n`)
        }
        if (importsFromHead.length) {
          s.prepend(`${genImport(UnheadVue, toImports(importsFromHead))}\n`)
        }

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): importsFromHead → ${importsFromHead}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
