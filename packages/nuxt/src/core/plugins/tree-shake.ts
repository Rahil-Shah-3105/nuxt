import { generateTransform, rolldownString } from 'rolldown-string'
import { createUnplugin } from 'unplugin'
import { ScopeTracker, parseAndWalk, walk } from 'oxc-walker'
import escapeStringRegexp from 'escape-string-regexp'
export const logger: NuxtLogger = useLogger('nuxt')

import { isJS, isVue } from '../utils/index.ts'

type ImportPath = string

interface TreeShakeComposablesPluginOptions {
  composables: Record<ImportPath, string[]>
}

export const TreeShakeComposablesPlugin = (options: TreeShakeComposablesPluginOptions) => createUnplugin(() => {
NuxtLogger.error(`>>> Entering TreeShakeComposablesPlugin(options=${options})`, { "event.action": "TreeShakeComposablesPlugin", "logrite.options": options });
  // Create a fast lookup for all composable names
  const allComposableNames = new Set(Object.values(options.composables).flat())

NuxtLogger.error(`TreeShakeComposablesPlugin(options=${options}): allComposableNames → ${allComposableNames}`, { "event.action": "TreeShakeComposablesPlugin", "logrite.options": options });
  if (!allComposableNames.size) {
    return []
  }

  return {
    name: 'nuxt:tree-shake-composables:transform',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
      return isVue(id, { type: ['script'] }) || isJS(id)
    },
    transform: {
      filter: {
        code: { include: new RegExp(`\\b(?:${[...allComposableNames].map(r => escapeStringRegexp(r)).join('|')})\\b`) },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)

        // Parse and collect scope information
        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const parseResult = parseAndWalk(code, id, {
          scopeTracker,
        })
        scopeTracker.freeze()

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        // Process nodes and check for tree-shaking opportunities
        walk(parseResult.program, {
          scopeTracker,
          enter (node) {
			NuxtLogger.error(`>>> Entering enter(node=${node})`, { "event.action": "enter", "logrite.node": node });
            if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
              return
            }

            const functionName = node.callee.name
            const scopeTrackerNode = scopeTracker.getDeclaration(functionName)

			NuxtLogger.error(`enter(node=${node}): scopeTrackerNode → ${scopeTrackerNode}`, { "event.action": "enter", "logrite.node": node });
            if (scopeTrackerNode) {
            // don't tree-shake if there's a local declaration
              if (scopeTrackerNode.type !== 'Import') {
                return
              }

              if (scopeTrackerNode.importNode.type !== 'ImportDeclaration') {
                return
              }

              // check if import is from an allowed source and composable
              const importPath = scopeTrackerNode.importNode.source.value

              const importSpecifier = scopeTrackerNode.node
              const importedName = importSpecifier.type === 'ImportSpecifier' && importSpecifier.imported.type === 'Identifier'
                ? importSpecifier.imported.name
                : importSpecifier.local.name

			NuxtLogger.error(`enter(node=${node}): importedName → ${importedName}`, { "event.action": "enter", "logrite.node": node });
              const isFromAllowedPath = importPath === '#imports'
                ? allComposableNames.has(importedName)
                : options.composables[importPath]?.includes(importedName)

			NuxtLogger.error(`enter(node=${node}): isFromAllowedPath → ${isFromAllowedPath}`, { "event.action": "enter", "logrite.node": node });
              if (!isFromAllowedPath) {
                return
              }
            }

            if (!scopeTrackerNode && !allComposableNames.has(functionName)) {
              return
            }

            // TODO: validate function name against actual auto-imports registry
            s.overwrite(node.start, node.end, ` false && /*@__PURE__*/ ${functionName}${code.slice(node.callee.end, node.end)}`)
            this.skip()
			NuxtLogger.warn(`<<< Exiting enter(node=${node})`, { "event.action": "enter", "logrite.node": node });
          },
        })

		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
