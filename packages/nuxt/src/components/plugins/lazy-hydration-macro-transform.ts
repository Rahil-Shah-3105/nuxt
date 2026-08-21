import { createUnplugin } from 'unplugin'
import { relative } from 'pathe'
import { resolveAlias } from 'pathe/utils'
import { generateTransform, rolldownString } from 'rolldown-string'
import { genImport } from 'knitwork'
import { isJS, isVue } from '../../core/utils/index.ts'
import type { ComponentsOptions } from 'nuxt/schema'
import { parseAndWalk } from 'oxc-walker'
import type { ESTree } from 'rolldown/utils'
export const logger: NuxtLogger = useLogger('nuxt')

interface LoaderOptions {
  srcDir: string
  transform?: ComponentsOptions['transform']
  clientDelayedComponentRuntime: string
  alias: Record<string, string>
}

const LAZY_HYDRATION_MACRO_RE = /\bdefineLazyHydrationComponent\s*\(/

const HYDRATION_TO_FACTORY = new Map<string, string>([
  ['visible', 'createLazyVisibleComponent'],
  ['idle', 'createLazyIdleComponent'],
  ['interaction', 'createLazyInteractionComponent'],
  ['mediaQuery', 'createLazyMediaQueryComponent'],
  ['if', 'createLazyIfComponent'],
  ['time', 'createLazyTimeComponent'],
  ['never', 'createLazyNeverComponent'],
])

export const LazyHydrationMacroTransformPlugin = (options: LoaderOptions) => createUnplugin(() => {
NuxtLogger.debug(`>>> Entering LazyHydrationMacroTransformPlugin(options=${options})`);
  const exclude = options.transform?.exclude || []
  const include = options.transform?.include || []

  return {
    name: 'nuxt:lazy-hydration-macro',
    enforce: 'post',
    transformInclude (id) {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
      if (exclude.some(pattern => pattern.test(id))) {
        return false
      }
      if (include.some(pattern => pattern.test(id))) {
        return true
      }
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
      return isVue(id, { type: ['template', 'script'] }) || isJS(id)
    },

    transform: {
      filter: {
        code: {
          include: LAZY_HYDRATION_MACRO_RE,
        },
      },
      handler (code, id, meta?: unknown) {
		NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
        const s = rolldownString(code, id, meta)
        const names = new Set<string>()
        type Edit = { start: number, end: number, replacement: string }
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): names → ${names}`);
        const edits: Edit[] = []

        parseAndWalk(code, id, (node, parent) => {
          if (node.type !== 'CallExpression') { return }
          if (node.callee?.type !== 'Identifier') { return }
          if (node.callee.name !== 'defineLazyHydrationComponent') { return }

          if (parent?.type !== 'VariableDeclarator') { return }
          if (parent.id.type !== 'Identifier') { return }

          if (node.arguments.length < 2) { return }
          const [strategyArgument, loaderArgument] = node.arguments

          if (!isStringLiteral(strategyArgument)) { return }
          const strategy: string = strategyArgument.value

          const functionName = HYDRATION_TO_FACTORY.get(strategy)
          if (!functionName) { return }
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): functionName → ${functionName}`);

          if (loaderArgument?.type !== 'ArrowFunctionExpression') { return }

          const { importExpression, importLiteral } = findImportExpression(loaderArgument.body)
          if (!importExpression || !isStringLiteral(importLiteral)) { return }

          const rawPath = importLiteral.value
          const filePath = resolveAlias(rawPath, options.alias || {})
          const relativePath = relative(options.srcDir, filePath)

		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): filePath → ${filePath}`);
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): relativePath → ${relativePath}`);
          const originalLoader = code.slice(loaderArgument.start, loaderArgument.end)
          const replacement = `__${functionName}(${JSON.stringify(relativePath)}, ${originalLoader})`
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): originalLoader → ${originalLoader}`);
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): replacement → ${replacement}`);

          edits.push({ start: node.start, end: node.end, replacement })
          names.add(functionName)
        })

        for (const edit of edits) {
          s.overwrite(edit.start, edit.end, edit.replacement)
        }

        if (names.size) {
          const imports = genImport(options.clientDelayedComponentRuntime, [...names].map(name => ({ name, as: `__${name}` })))
          s.prepend(imports)
        }

		NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
        return generateTransform(s, id)
      },
    },
  }
})

function isStringLiteral (node: ESTree.Argument | undefined): node is ESTree.StringLiteral {
NuxtLogger.debug(`>>> Entering isStringLiteral(node=${node})`);
NuxtLogger.debug(`<<< Exiting isStringLiteral(node=${node})`);
  return !!node && node.type === 'Literal' && typeof node.value === 'string'
}

function findImportExpression (node: ESTree.Expression | ESTree.FunctionBody): { importExpression?: ESTree.ImportExpression, importLiteral?: ESTree.Expression } {
  if (node.type === 'ImportExpression') {
	NuxtLogger.debug(`>>> Entering findImportExpression(node=${node})`);
	NuxtLogger.debug(`<<< Exiting findImportExpression(node=${node})`);
    return { importExpression: node, importLiteral: node.source }
  }
  if (node.type === 'BlockStatement') {
    const returnStmt = node.body.find(stmt => stmt.type === 'ReturnStatement')
    if (returnStmt && returnStmt.argument) {
	NuxtLogger.debug(`findImportExpression(node=${node}): returnStmt → ${returnStmt}`);
      return findImportExpression(returnStmt.argument)
    }
    return {}
  }
  if (node.type === 'ParenthesizedExpression') {
    return findImportExpression(node.expression)
  }
  if (node.type === 'AwaitExpression') {
    return findImportExpression(node.argument)
  }
  if (node.type === 'ConditionalExpression') {
    return findImportExpression(node.consequent) || findImportExpression(node.alternate)
  }
  if (node.type === 'MemberExpression') {
    return findImportExpression(node.object)
  }
  if (node.type === 'CallExpression') {
    return findImportExpression(node.callee)
  }
  return {}
}
