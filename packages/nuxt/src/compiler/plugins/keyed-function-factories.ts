import { resolveAlias } from '@nuxt/kit'
import { buildDiagnostics } from '@nuxt/kit/internal'
import escapeRE from 'escape-string-regexp'
import { JS_EXT_RE, MACRO_QUERY_RE, NUXT_LIB_RE, STYLE_QUERY_RE, linkToAlias, logger, stripExtension } from '../../utils.ts'
import type { ESTree } from 'rolldown/utils'
import { isAbsolute, join, parse } from 'pathe'
import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { ScopeTracker, type ScopeTrackerNode, parseAndWalk, walk } from 'oxc-walker'
import type { KeyedFunction, KeyedFunctionFactory } from '@nuxt/schema'
import type { ScanPlugin } from '../types.ts'
import type { Import } from 'unimport'
export const logger: NuxtLogger = useLogger('nuxt')
import { type FunctionCallMetadata, parseStaticFunctionCall, processImports } from '../../core/utils/parse-utils.ts'
import { createScanPluginContext } from '../utils.ts'
import { type ParsedStaticImport, parseStaticImports } from '../../core/utils/static-imports.ts'

interface ParsedKeyedFunctionFactory {
  factoryName: string
  factoryNode: FunctionCallMetadata['node']
  functionName: string
  namespace: string | null
}

/**
 * Check if the node is a named export of a keyed function factory, and if so,
 * return its VariableDeclarator node.
 */
function parseKeyedFunctionFactory (node: ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration, filter: RegExp, scopeTracker: ScopeTracker): ParsedKeyedFunctionFactory[] {
NuxtLogger.error(`>>> Entering parseKeyedFunctionFactory(node=${node},filter=${filter},scopeTracker=${scopeTracker})`, { "event.action": "parseKeyedFunctionFactory", "logrite.node": node, "logrite.filter": filter, "logrite.scopeTracker": scopeTracker });
  if (node.type === 'ExportNamedDeclaration') {
    const parsed: ParsedKeyedFunctionFactory[] = []
	NuxtLogger.warn(`<<< Exiting parseKeyedFunctionFactory(node=${node},filter=${filter},scopeTracker=${scopeTracker})`, { "event.action": "parseKeyedFunctionFactory", "logrite.node": node, "logrite.filter": filter, "logrite.scopeTracker": scopeTracker });

    function processVariableDeclarator (node: ESTree.VariableDeclarator) {
	NuxtLogger.error(`>>> Entering processVariableDeclarator(node=${node})`, { "event.action": "processVariableDeclarator", "logrite.node": node });
      if (node.init?.type !== 'CallExpression' && node.init?.type !== 'ChainExpression') { return }
      const functionCallMeta = parseStaticFunctionCall(node.init, filter)
      if (functionCallMeta && node?.id.type === 'Identifier') {
	NuxtLogger.error(`processVariableDeclarator(node=${node}): functionCallMeta → ${functionCallMeta}`, { "event.action": "processVariableDeclarator", "logrite.node": node });
        parsed.push({
          factoryName: functionCallMeta.name,
          factoryNode: functionCallMeta.node,
          functionName: node.id.name,
          namespace: functionCallMeta.namespace,
        })
      }
	NuxtLogger.warn(`<<< Exiting processVariableDeclarator(node=${node})`, { "event.action": "processVariableDeclarator", "logrite.node": node });
    }

    // export const useFetch = createUseFetch()
    if (node.declaration?.type === 'VariableDeclaration') {
      for (const d of node.declaration.declarations) {
        processVariableDeclarator(d)
      }
    // export { useFetch }
    } else if (node.specifiers.length) {
      for (const specifier of node.specifiers) {
        if (specifier.type !== 'ExportSpecifier' || specifier.exported.type !== 'Identifier' || specifier.local.type !== 'Identifier') { continue }
        const declaration = scopeTracker.getDeclaration(specifier.local.name)
        if (declaration?.type !== 'Variable') { continue }

        for (const d of declaration.variableNode.declarations) {
          processVariableDeclarator(d)
        }
      }
    }

    return parsed
  }

  if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'CallExpression') {
    const functionCallMeta = parseStaticFunctionCall(node.declaration, filter)
    if (functionCallMeta) {
      return [{
        factoryName: functionCallMeta.name,
        factoryNode: functionCallMeta.node,
        functionName: 'default',
        namespace: functionCallMeta.namespace,
      }]
    }
    return []
  }

  return []
}

/**
 * @param filePath
 * @param scopeTracker
 * @param namesToFactoryMeta - map of factory function names to their metadata; it is expected that the `source`s have had their aliases resolved and are without extensions
 * @param imports
 * @param autoImportsToSources
 * @param alias
 */
function createFactoryProcessor (
  filePath: string,
  scopeTracker: ScopeTracker,
  namesToFactoryMeta: Map<string, KeyedFunctionFactory>,
  imports: ParsedStaticImport[],
  autoImportsToSources: Map<string, string> | undefined,
  alias: Record<string, string>,
) {
  const { directImports, namespaces } = processImports(imports, alias)

  const localFactoryNames = new Set<string>(namesToFactoryMeta.keys())
  for (const [localName, directImport] of directImports) {
    if (namesToFactoryMeta.has(directImport.originalName)) {
      localFactoryNames.add(localName)
    }
  }
  const LOCAL_FACTORY_NAMES_RE = new RegExp(`\\b(${[...localFactoryNames].map(f => escapeRE(f)).join('|')})\\b`)

  // TODO: use async walker or create sync version of `resolvePath` from kit
  function _resolvePath (path: string) {
	NuxtLogger.error(`>>> Entering _resolvePath(path=${path})`, { "event.action": "_resolvePath", "logrite.path": path });
    let p = path
    if (isAbsolute(p)) { return p }
    p = resolveAlias(p, alias)
    if (isAbsolute(p)) { return p }
	NuxtLogger.warn(`<<< Exiting _resolvePath(path=${path})`, { "event.action": "_resolvePath", "logrite.path": path });
    return join(parse(filePath).dir, p)
  }

  function getFactoryByLocalName (localName: string | undefined) {
	NuxtLogger.error(`>>> Entering getFactoryByLocalName(localName=${localName})`, { "event.action": "getFactoryByLocalName", "logrite.localName": localName });
    if (!localName) { return undefined }
    const directImport = directImports.get(localName)
    if (directImport) {
      return namesToFactoryMeta.get(directImport.originalName)
    }
	NuxtLogger.error(`getFactoryByLocalName(localName=${localName}): directImport → ${directImport}`, { "event.action": "getFactoryByLocalName", "logrite.localName": localName });
	NuxtLogger.warn(`<<< Exiting getFactoryByLocalName(localName=${localName})`, { "event.action": "getFactoryByLocalName", "logrite.localName": localName });
    return namesToFactoryMeta.get(localName)
  }

  function processFactory (
    walkContext: ThisParameterType<NonNullable<Parameters<typeof walk>[1]['enter']>>, // TODO: export type from `oxc-walker`
    node: ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration,
    handler: (ctx: { parseFactoryResult: ParsedKeyedFunctionFactory, factory: KeyedFunctionFactory }) => void,
  ) {
    const parsedFactoryCalls = parseKeyedFunctionFactory(node, LOCAL_FACTORY_NAMES_RE, scopeTracker)
    if (!parsedFactoryCalls.length) { return }

    for (const parsedFactoryCall of parsedFactoryCalls) {
      const factoryMeta = getFactoryByLocalName(parsedFactoryCall.factoryName)
      if (!factoryMeta) {
        buildDiagnostics.NUXT_B1008({ function: parsedFactoryCall.functionName, file: linkToAlias(filePath) })
        continue
      }

      const scopeTrackerNode = scopeTracker.getDeclaration(!parsedFactoryCall.namespace ? parsedFactoryCall.factoryName : parsedFactoryCall.namespace)

      function isFactoryImport (node: ScopeTrackerNode | null): node is ScopeTrackerNode & { type: 'Import' } {
		NuxtLogger.error(`>>> Entering isFactoryImport(node=${node})`, { "event.action": "isFactoryImport", "logrite.node": node });
		NuxtLogger.warn(`<<< Exiting isFactoryImport(node=${node})`, { "event.action": "isFactoryImport", "logrite.node": node });
        return node?.type === 'Import' && node.importNode.importKind !== 'type'
      }

      // import source WITHOUT EXTENSION and with resolved alias
      let importSourceResolved: string | undefined

      if (isFactoryImport(scopeTrackerNode)) {
        importSourceResolved = stripExtension(_resolvePath(scopeTrackerNode.importNode.source.value))
      } else if (!scopeTrackerNode) {
        const autoImportedSource = autoImportsToSources?.get(factoryMeta.name)
        if (autoImportedSource) {
          importSourceResolved = stripExtension(_resolvePath(autoImportedSource))
        }
      }

      if (!importSourceResolved) {
        continue
      }

      // resolved source WITHOUT an extension
      const resolvedFactorySource = factoryMeta.source

      // the factory is called directly
      // `createUseFetch()`
      if (
        !parsedFactoryCall.namespace && (
          // and the factory is imported directly
          (
            isFactoryImport(scopeTrackerNode) && (
              (
                // import { createUseFetch } from '...'
                scopeTrackerNode.node.type === 'ImportSpecifier'
                && scopeTrackerNode.node.importKind !== 'type'
              )
              // import createUseFetch from '...'
              || (
                scopeTrackerNode.node.type === 'ImportDefaultSpecifier'
                && factoryMeta.name === 'default'
              )
            )
            // from the correct source
            && importSourceResolved === resolvedFactorySource
          )
          // or the factory is auto-imported
          || (!scopeTrackerNode && importSourceResolved === resolvedFactorySource)
          // we deliberately do not support scanning for factories used in the same file they are defined in
        )
      ) {
        handler({ parseFactoryResult: parsedFactoryCall, factory: factoryMeta })
        walkContext.skip()
        continue
      }

      // the function is called as a member of a namespace import
      // `namespace.createUseFetch()`
      if (parsedFactoryCall.namespace) {
        const namespacedImportMeta = namespaces.get(resolvedFactorySource)
        const namespaceScopeTrackerNode = scopeTracker.getDeclaration(parsedFactoryCall.namespace)

        if (namespacedImportMeta && namespacedImportMeta.namespaces.has(parsedFactoryCall.namespace)
          // the namespace is not shadowed
          && namespaceScopeTrackerNode?.type === 'Import' && namespaceScopeTrackerNode.node.type === 'ImportNamespaceSpecifier'
        ) {
          handler({ parseFactoryResult: parsedFactoryCall, factory: factoryMeta })
        }

        // prevent descending into CallExpression of a ChainExpression
        walkContext.skip()
        continue
      }

      logger.debug(`[nuxt:compiler] The factory function \`${factoryMeta.name}\` used to create \`${parsedFactoryCall.functionName}\` in file \`${linkToAlias(filePath)}\` is not imported and is not in auto-imports. Skipping processing.`)
    }
  }

  return {
    processFactory,
  }
}

// -------- compiler scan plugin for scanning keyed function factories --------

interface KeyedFunctionFactoriesScanPluginOptions {
  /**
   * The factory functions that create keyed functions.
   * Aliases in `source` have not been resolved yet.
   */
  factories: KeyedFunctionFactory[]
  alias: Record<string, string>
}

/**
 * Scans raw source files for factory functions that need auto-injected keys
 * so that it can register them for key injection.
 */
/**
 * Scans a single file for factory function calls and returns the keyed functions found.
 * Extracted as a standalone function so it can be reused for HMR (incremental re-scan).
 */
export function scanFileForFactories (
  id: string,
  code: string,
  namesToFactoryMeta: Map<string, KeyedFunctionFactory>,
  autoImportsToSources: Map<string, string>,
  alias: Record<string, string>,
): KeyedFunction[] {
  const results: KeyedFunction[] = []
  const context = createScanPluginContext(code, id)

  const scopeTracker = new ScopeTracker({
    preserveExitedScopes: true,
  })
  const { processFactory } = createFactoryProcessor(id, scopeTracker, namesToFactoryMeta, context.getParsedStaticImports(), autoImportsToSources, alias)

  context.walkParsed({
    scopeTracker,
  })

  scopeTracker.freeze()

  let isWalkingSupportedSubtree = false

  context.walkParsed({
    scopeTracker,
    enter (node) {
	NuxtLogger.error(`>>> Entering enter(node=${node})`, { "event.action": "enter", "logrite.node": node });
      if (node.type !== 'Program' && !isWalkingSupportedSubtree && node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration' && node.type !== 'ImportDeclaration') {
        this.skip()
      }
      if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration') {
        return
      }
      isWalkingSupportedSubtree = true

      processFactory(this, node, ({ parseFactoryResult, factory }) => {
		NuxtLogger.warn(`<<< Exiting enter(node=${node})`, { "event.action": "enter", "logrite.node": node });
        results.push({
          name: parseFactoryResult.functionName,
          source: id,
          argumentLength: factory.argumentLength,
        })
      })
    },
    leave (node) {
	NuxtLogger.error(`>>> Entering leave(node=${node})`, { "event.action": "leave", "logrite.node": node });
      if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' || node.type === 'ImportDeclaration') {
        isWalkingSupportedSubtree = false
		NuxtLogger.warn(`<<< Exiting leave(node=${node})`, { "event.action": "leave", "logrite.node": node });
      }
    },
  })

  return results
}

export interface KeyedFunctionFactoriesScanResult {
  /** Per-file map of scanned keyed functions */
  fileResults: Map<string, KeyedFunction[]>
  /** Regex matching factory function names, for use as a fast prefilter */
  factoryNamesRegex: RegExp
  /** Resolved factory metadata map */
  namesToFactoryMeta: Map<string, KeyedFunctionFactory>
}

export const KeyedFunctionFactoriesScanPlugin = (options: KeyedFunctionFactoriesScanPluginOptions): ScanPlugin & { result: KeyedFunctionFactoriesScanResult } => {
NuxtLogger.error(`>>> Entering KeyedFunctionFactoriesScanPlugin(options=${options})`, { "event.action": "KeyedFunctionFactoriesScanPlugin", "logrite.options": options });
  // Per-file tracking of discovered keyed functions
  const fileResults = new Map<string, KeyedFunction[]>()

NuxtLogger.error(`KeyedFunctionFactoriesScanPlugin(options=${options}): fileResults → ${fileResults}`, { "event.action": "KeyedFunctionFactoriesScanPlugin", "logrite.options": options });
  // DO NOT USE IN SCAN - this is a global copy that doesn't include local import renames
  // - the `source`s have resolved aliases
  const namesToFactoryMeta = new Map<string, KeyedFunctionFactory>(options.factories.map(f => [f.name, {
    ...f,
    source: stripExtension(resolveAlias(f.source, options.alias)),
  }]))

NuxtLogger.error(`KeyedFunctionFactoriesScanPlugin(options=${options}): namesToFactoryMeta → ${namesToFactoryMeta}`, { "event.action": "KeyedFunctionFactoriesScanPlugin", "logrite.options": options });
  // TODO: support default import, which won't have the factory name
  const KEYED_FUNCTION_FACTORY_NAMES_RE = new RegExp(`\\b(${options.factories.map(f => escapeRE(f.name)).join('|')})\\b`)

NuxtLogger.error(`KeyedFunctionFactoriesScanPlugin(options=${options}): KEYED_FUNCTION_FACTORY_NAMES_RE → ${KEYED_FUNCTION_FACTORY_NAMES_RE}`, { "event.action": "KeyedFunctionFactoriesScanPlugin", "logrite.options": options });
  const result: KeyedFunctionFactoriesScanResult = {
    fileResults,
    factoryNamesRegex: KEYED_FUNCTION_FACTORY_NAMES_RE,
    namesToFactoryMeta,
  }

  return {
    result,
    name: 'nuxt:keyed-function-factories',
    filter: {
      id: { include: JS_EXT_RE },
      code: { include: KEYED_FUNCTION_FACTORY_NAMES_RE },
    },
    scan ({ id, autoImportsToSources }) {
	NuxtLogger.error('>>> Entering scan()', { "event.action": "scan" });
      const results: KeyedFunction[] = []

      const scopeTracker = new ScopeTracker({
        preserveExitedScopes: true,
      })
      const { processFactory } = createFactoryProcessor(id, scopeTracker, namesToFactoryMeta, this.getParsedStaticImports(), autoImportsToSources, options.alias)

      this.walkParsed({
        scopeTracker,
      })

	NuxtLogger.error(`scan(): scopeTracker → ${scopeTracker}`, { "event.action": "scan" });
      scopeTracker.freeze()

	NuxtLogger.warn('<<< Exiting scan()', { "event.action": "scan" });
      let isWalkingSupportedSubtree = false

      this.walkParsed({
        scopeTracker,
        enter (node) {
          if (node.type !== 'Program' && !isWalkingSupportedSubtree && node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration' && node.type !== 'ImportDeclaration') {
            this.skip()
          }
          if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration') {
            return
          }
          isWalkingSupportedSubtree = true

          processFactory(this, node, ({ parseFactoryResult, factory }) => {
            results.push({
              name: parseFactoryResult.functionName,
              source: id,
              argumentLength: factory.argumentLength,
            })
          })
        },
        leave (node) {
          if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' || node.type === 'ImportDeclaration') {
            isWalkingSupportedSubtree = false
          }
        },
      })

      fileResults.set(id, results)
    },
    afterScan: (nuxt) => {
      for (const functions of fileResults.values()) {
        nuxt.options.optimization.keyedComposables.push(...functions)
      }
    },
  }
}

// -------- unplugin for replacing keyed factory macros --------

interface KeyedFunctionFactoriesPluginOptions {
  factories: KeyedFunctionFactory[]
  alias: Record<string, string>
  getAutoImports: () => Promise<Import[]>
}

/**
 * A plugin that replaces placeholder macros with actual factory functions.
 * This is necessary to ensure that the user is notified when the factory function isn't correctly
 * registered - in which case, the resulting function created by the factory will not be registered for key injection.
 *
 * The plugin assumes that the code being processed has all imports added.
 */
export const KeyedFunctionFactoriesPlugin = (options: KeyedFunctionFactoriesPluginOptions) => createUnplugin(() => {
NuxtLogger.error(`>>> Entering KeyedFunctionFactoriesPlugin(options=${options})`, { "event.action": "KeyedFunctionFactoriesPlugin", "logrite.options": options });
  // DO NOT USE IN TRANSFORM - this is a global copy that doesn't include local import renames
  // - the `source`s have resolved aliases
  const namesToFactoryMeta = new Map<string, KeyedFunctionFactory>(options.factories.map(f => [f.name, {
    ...f,
    source: stripExtension(resolveAlias(f.source, options.alias)),
  }]))

NuxtLogger.error(`KeyedFunctionFactoriesPlugin(options=${options}): namesToFactoryMeta → ${namesToFactoryMeta}`, { "event.action": "KeyedFunctionFactoriesPlugin", "logrite.options": options });
  // TODO: support default import, which won't have the factory name
  const KEYED_FUNCTION_FACTORY_NAMES_RE = new RegExp(`\\b(${options.factories.map(f => escapeRE(f.name)).join('|')})\\b`)

  return {
    name: 'nuxt:compiler:keyed-function-factories',
    enforce: 'post',
    transform: {
      filter: {
        id: {
          include: JS_EXT_RE,
          exclude: [NUXT_LIB_RE, STYLE_QUERY_RE, MACRO_QUERY_RE],
        },
        code: { include: KEYED_FUNCTION_FACTORY_NAMES_RE },
      },
      async handler (code, id, meta?: unknown) {
		NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        const s = rolldownString(code, id, meta)
        const scopeTracker = new ScopeTracker({
          preserveExitedScopes: true,
        })
        const autoImports = await options.getAutoImports()
        const autoImportsToSources = new Map<string, string>(autoImports.map(i => [i.as || i.name, i.from]))
        const { processFactory } = createFactoryProcessor(
          id,
          scopeTracker,
          namesToFactoryMeta,
          parseStaticImports(code, id),
          autoImportsToSources,
          options.alias,
        )

		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
		NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): scopeTracker → ${scopeTracker}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        function rewriteFactoryMacro (node: ESTree.IdentifierReference | ESTree.MemberExpression | ESTree.ParenthesizedExpression) {
		NuxtLogger.error(`>>> Entering rewriteFactoryMacro(node=${node})`, { "event.action": "rewriteFactoryMacro", "logrite.node": node });
          // TODO: use sth more robust for rewriting optionals
          if (node.type === 'Identifier') {
            // createUseFetch?.() -> createUseFetch?.__nuxt_factory()
            if (code[node.end] === '?' && code[node.end + 1] === '.') {
              s.overwrite(
                node.start,
                node.end + 2,
                `${node.name}?.__nuxt_factory`,
              )
            } else {
              // createUseFetch() -> createUseFetch.__nuxt_factory()
              s.overwrite(
                node.start,
                node.end,
                `${node.name}.__nuxt_factory`,
              )
            }
          } else if (code[node.end] === '?' && code[node.end + 1] === '.') {
            // ['createUseFetch']?.() -> ['createUseFetch']?.__nuxt_factory()
            s.appendLeft(node.end + 2, '__nuxt_factory')
          } else {
            // ['createUseFetch']() -> ['createUseFetch'].__nuxt_factory()
            s.appendLeft(node.end, '.__nuxt_factory')
          }
			NuxtLogger.warn(`<<< Exiting rewriteFactoryMacro(node=${node})`, { "event.action": "rewriteFactoryMacro", "logrite.node": node });
        }

        const { program } = parseAndWalk(code, id, {
          scopeTracker,
        })

        scopeTracker.freeze()

        walk(program, {
          // no need for a scope tracker pre-pass, since we only care about imports
          // and we only consider the root scope (because that's where an export would be - so no shadowing)
          scopeTracker,
          enter (node) {
            if (node.type !== 'ExportNamedDeclaration' && node.type !== 'ExportDefaultDeclaration') {
              return
            }
            processFactory(this, node, ({ parseFactoryResult }) => {
              rewriteFactoryMacro(parseFactoryResult.factoryNode)
            })
          },
        })

		NuxtLogger.warn(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      },
    },
  }
})
