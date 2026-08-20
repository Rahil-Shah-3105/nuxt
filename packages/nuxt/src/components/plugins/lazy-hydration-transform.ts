import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { camelCase, pascalCase } from 'scule'

import { tryUseNuxt } from '@nuxt/kit'
import { componentDiagnostics } from '@nuxt/kit/internal'
import { parse, walk } from 'ultrahtml'
import { ScopeTracker, parseAndWalk } from 'oxc-walker'
import { isVue } from '../../core/utils/index.ts'
import { linkToAlias, offsetToPosition } from '../../utils.ts'
import type { Component, ComponentsOptions } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

interface LoaderOptions {
  getComponents (): Component[]
  transform?: ComponentsOptions['transform']
}

const SCRIPT_RE = /(?<=<script[^>]*>)[\s\S]*?(?=<\/script>)/gi
const TEMPLATE_RE = /<template>([\s\S]*)<\/template>/
const hydrationStrategyMap = {
  hydrateOnIdle: 'Idle',
  hydrateOnVisible: 'Visible',
  hydrateOnInteraction: 'Interaction',
  hydrateOnMediaQuery: 'MediaQuery',
  hydrateAfter: 'Time',
  hydrateWhen: 'If',
  hydrateNever: 'Never',
}

const TEMPLATE_WITH_LAZY_HYDRATION_RE = /<template>[\s\S]*\b(?:hydrate-on-idle|hydrateOnIdle|hydrate-on-visible|hydrateOnVisible|hydrate-on-interaction|hydrateOnInteraction|hydrate-on-media-query|hydrateOnMediaQuery|hydrate-after|hydrateAfter|hydrate-when|hydrateWhen|hydrate-never|hydrateNever)\b[\s\S]*<\/template>/

export const LazyHydrationTransformPlugin = (options: LoaderOptions) => createUnplugin(() => {
NuxtLogger.debug(`>>> Entering LazyHydrationTransformPlugin(options=${options})`);
  const exclude = options.transform?.exclude || []
  const include = options.transform?.include || []
  const nuxt = tryUseNuxt()

  return {
    name: 'nuxt:components-loader-pre',
    enforce: 'pre',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
      if (exclude.some(pattern => pattern.test(id))) {
        return false
      }
      if (include.some(pattern => pattern.test(id))) {
        return true
      }
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isVue(id)
    },
    transform: {
      filter: {
        code: { include: TEMPLATE_WITH_LAZY_HYDRATION_RE },
      },

      async handler (code, id, meta?: unknown) {
		NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
        // change <LazyMyComponent hydrate-on-idle /> to <LazyIdleMyComponent hydrate-on-idle />
        const { 0: template, index: offset = 0 } = code.match(TEMPLATE_RE) || {}
        if (!template) {
          return
        }
        try {
          const ast = parse(template)

		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): ast → ${ast}`);
          const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
          for (const { 0: script } of code.matchAll(SCRIPT_RE)) {
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): scopeTracker → ${scopeTracker}`);
            if (!script) { continue }
            try {
              parseAndWalk(script, id, { scopeTracker })
            } catch { /* ignore */ }
			NuxtLogger.error(`Exception in handler(code=${code},id=${id},meta=${meta}): (no error binding)`);
          }

          const s = rolldownString(code, id, meta)

		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
          const components = new Set(options.getComponents().map(c => c.pascalName))
          await walk(ast, (node) => {
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): components → ${components}`);
            if (node.type !== 1 /* ELEMENT_NODE */) {
              return
            }

            if (scopeTracker.getDeclaration(node.name)) {
              return
            }

            const pascalName = pascalCase(node.name.replace(/^(?:Lazy|lazy-)/, ''))
            if (!components.has(pascalName)) {
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): pascalName → ${pascalName}`);
              // not auto-imported
              return
            }

            let strategy: string | undefined

            for (const attr in node.attributes) {
              const isDynamic = attr.startsWith(':')
              const prop = camelCase(isDynamic ? attr.slice(1) : attr)
              if (prop in hydrationStrategyMap) {
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): isDynamic → ${isDynamic}`);
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): prop → ${prop}`);
                if (strategy) {
                  componentDiagnostics.NUXT_B3005({ component: node.name, file: linkToAlias(id, nuxt, offsetToPosition(code, node.loc[0].start + offset)) })
                } else {
                  strategy = hydrationStrategyMap[prop as keyof typeof hydrationStrategyMap]
                }
              }
            }

            if (strategy && !/^(?:Lazy|lazy-)/.test(node.name)) {
              if (node.name !== 'template' && (nuxt?.options.dev || nuxt?.options.test)) {
                const relativePath = linkToAlias(id, nuxt, offsetToPosition(code, node.loc[0].start + offset))
                componentDiagnostics.NUXT_B3006({ component: node.name, file: relativePath, lazyName: `Lazy${pascalCase(node.name)}` })
              }
              return
            }

            if (strategy) {
              const newName = 'Lazy' + strategy + pascalName
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): newName → ${newName}`);
              const chunk = template.slice(node.loc[0].start, node.loc.at(-1)!.end)
              const chunkOffset = node.loc[0].start + offset
			NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): chunk → ${chunk}`);
              const { 0: startingChunk, index: startingPoint = 0 } = chunk.match(new RegExp(`<${node.name}[^>]*>`)) || {}
              s.overwrite(startingPoint + chunkOffset, startingPoint + chunkOffset + startingChunk!.length, startingChunk!.replace(node.name, newName))

              const { 0: endingChunk, index: endingPoint } = chunk.match(new RegExp(`<\\/${node.name}[^>]*>$`)) || {}
              if (endingChunk && endingPoint) {
                s.overwrite(endingPoint + chunkOffset, endingPoint + chunkOffset + endingChunk.length, endingChunk.replace(node.name, newName))
              }
            }
          })
          return generateTransform(s, id)
        } catch {
		NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
          // ignore errors if it's not html-like
        }
      },
    },
  }
})
