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
NuxtLogger.debug(`>>> Entering TreeShakeComposablesPlugin(options=${options})`);
  // Create a fast lookup for all composable names
  const allComposableNames = new Set(Object.values(options.composables).flat())

NuxtLogger.debug(`TreeShakeComposablesPlugin(options=${options}): allComposableNames → ${allComposableNames}`);
  if (!allComposableNames.size) {
    return []
  }

  return {
    name: 'nuxt:tree-shake-composables:transform',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isVue(id, { type: ['script'] }) || isJS(id)
    },
    transform: {
      filter: {
        code: { include: new RegExp(`\\b(?:${[...allComposableNames].map(r => escapeStringRegexp(r)).join('|')})\\b`) },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
        const s = rolldownString(code, id, meta)

        // Parse and collect scope information
        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const parseResult = parseAndWalk(code, id, {
          scopeTracker,
        })
        scopeTracker.freeze()

		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
        // Process nodes and check for tree-shaking opportunities
        walk(parseResult.program, {
          scopeTracker,
          enter (node) {
			NuxtLogger.debug(`>>> Entering enter(node=${node})`);
            if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
              return
            }

            const functionName = node.callee.name
            const scopeTrackerNode = scopeTracker.getDeclaration(functionName)

			NuxtLogger.debug(`enter(node=${node}): scopeTrackerNode → ${scopeTrackerNode}`);
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

			NuxtLogger.debug(`enter(node=${node}): importedName → ${importedName}`);
              const isFromAllowedPath = importPath === '#imports'
                ? allComposableNames.has(importedName)
                : options.composables[importPath]?.includes(importedName)

			NuxtLogger.debug(`enter(node=${node}): isFromAllowedPath → ${isFromAllowedPath}`);
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
			NuxtLogger.debug(`<<< Exiting enter(node=${node})`);
          },
        })

		NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
        return generateTransform(s, id)
      },
    },
  }
})
