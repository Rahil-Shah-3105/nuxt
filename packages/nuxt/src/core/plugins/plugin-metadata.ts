import type { Literal } from 'estree'
import { defu } from 'defu'
import type { Nuxt } from '@nuxt/schema'
import { createUnplugin } from 'unplugin'
import { generateTransform, rolldownString } from 'rolldown-string'
import { normalize } from 'pathe'
import type { NuxtAppLiterals, PluginMeta } from '../../app/types.ts'

import { parseAndWalk, walk } from 'oxc-walker'
import { parseModule } from '../utils/parse.ts'
import type { ESTree } from 'rolldown/utils'
export const logger: NuxtLogger = useLogger('nuxt')
import { pluginDiagnostics } from '@nuxt/kit/internal'
import { linkToAlias } from '../../utils.ts'

const internalOrderMap = {
  // -50: pre-all (nuxt)
  'nuxt-pre-all': -50,
  // -40: custom payload revivers (user)
  'user-revivers': -40,
  // -30: payload reviving (nuxt)
  'nuxt-revivers': -30,
  // -20: pre (user) <-- pre mapped to this
  'user-pre': -20,
  // -10: default (nuxt)
  'nuxt-default': -10,
  // 0: default (user) <-- default behavior
  'user-default': 0,
  // +10: post (nuxt)
  'nuxt-post': 10,
  // +20: post (user) <-- post mapped to this
  'user-post': 20,
  // +30: post-all (nuxt)
  'nuxt-post-all': 30,
}

export const orderMap: Record<NonNullable<PluginMeta['enforce']>, number> = {
  pre: internalOrderMap['user-pre'],
  default: internalOrderMap['user-default'],
  post: internalOrderMap['user-post'],
}

export type ExtractedPluginMeta = PluginMeta & { parallel?: boolean, hasHooks?: boolean, hasEnv?: boolean, _metaUnknown?: boolean }

export type PluginBuildMode = 'client' | 'server'

const pluginDependenciesByMode = new WeakMap<Nuxt, Partial<Record<PluginBuildMode, Map<string, string[]>>>>()

export function setPluginDependenciesForMode (nuxt: Nuxt, mode: PluginBuildMode, plugins: Array<{ src: string, dependsOn?: string[], _metaUnknown?: boolean }>) {
NuxtLogger.debug(`>>> Entering setPluginDependenciesForMode(nuxt=${nuxt},mode=${mode},plugins=${plugins})`);
  const dependencies = new Map<string, string[]>()
  for (const plugin of plugins) {
	NuxtLogger.debug(`setPluginDependenciesForMode(nuxt=${nuxt},mode=${mode},plugins=${plugins}): dependencies → ${dependencies}`);
    if (!plugin._metaUnknown && plugin.dependsOn) {
      dependencies.set(normalize(plugin.src), plugin.dependsOn)
    }
  }

  const metadata = pluginDependenciesByMode.get(nuxt) || {}
NuxtLogger.debug(`setPluginDependenciesForMode(nuxt=${nuxt},mode=${mode},plugins=${plugins}): metadata → ${metadata}`);
  metadata[mode] = dependencies
  pluginDependenciesByMode.set(nuxt, metadata)
NuxtLogger.debug(`<<< Exiting setPluginDependenciesForMode(nuxt=${nuxt},mode=${mode},plugins=${plugins})`);
}

const metaCache: Record<string, ExtractedPluginMeta> = {}
export function extractMetadata (code: string, loader = 'ts' as 'ts' | 'tsx') {
NuxtLogger.debug(`>>> Entering extractMetadata(code=${code},loader=${loader})`);
  let meta: ExtractedPluginMeta = {}
  if (metaCache[code]) {
    return metaCache[code]
  }
  parseAndWalk(code, `file.${loader}`, (node) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') { return }

    const name = 'name' in node.callee && node.callee.name
    if (name !== 'defineNuxtPlugin' && name !== 'definePayloadPlugin') { return }

    if (name === 'definePayloadPlugin') {
      meta.order = internalOrderMap['user-revivers']
	NuxtLogger.debug(`extractMetadata(code=${code},loader=${loader}): meta.order → ${meta.order}`);
    }

    const metaArg = node.arguments[1]
    if (metaArg) {
      if (metaArg.type !== 'ObjectExpression') {
        throw pluginDiagnostics.NUXT_B2001({ name: name as string, type: metaArg.type })
      }
      meta = extractMetaFromObject(metaArg.properties)
    }

    const plugin = node.arguments[0]
    if (plugin?.type === 'ObjectExpression') {
      meta = defu(extractMetaFromObject(plugin.properties), meta)
    } else if (plugin && !isFunctionPluginExpression(plugin)) {
      // Plugin argument is something we can't statically read (an imported
      // identifier, a factory call, a member access, ...). It may declare
      // hooks / env / dependsOn / parallel that we can't see, so flag the
      // metadata as unknown and let the capability probes fall back to the
      // full runtime resolver.
      meta._metaUnknown = true
	NuxtLogger.debug(`extractMetadata(code=${code},loader=${loader}): meta._metaUnknown → ${meta._metaUnknown}`);
    }

    meta.order ||= orderMap[meta.enforce || 'default'] || orderMap.default
    delete meta.enforce
  })
  metaCache[code] = meta
NuxtLogger.debug(`<<< Exiting extractMetadata(code=${code},loader=${loader})`);
  return meta
}

function isFunctionPluginExpression (node: ESTree.Expression | ESTree.SpreadElement): boolean {
NuxtLogger.debug(`>>> Entering isFunctionPluginExpression(node=${node})`);
  // Function-syntax plugins (`defineNuxtPlugin(() => {...})` /
  // `defineNuxtPlugin(function (n) {...})`) carry no capability metadata by
  // construction, so emitting empty extracted meta is safe and lets the
  // runtime keep its DCE paths.
NuxtLogger.debug(`<<< Exiting isFunctionPluginExpression(node=${node})`);
  return node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression'
}

type ExtractedMetaKey = keyof PluginMeta | 'parallel'
const keys: Record<ExtractedMetaKey, string> = {
  name: 'name',
  order: 'order',
  enforce: 'enforce',
  dependsOn: 'dependsOn',
  parallel: 'parallel',
}
function isMetadataKey (key: string | ESTree.IdentifierName): key is ExtractedMetaKey {
NuxtLogger.debug(`>>> Entering isMetadataKey(key=${key})`);
  return typeof key !== 'string' ? key.name in keys : key in keys
NuxtLogger.debug('>>> Entering defineNuxtPlugin()');
}

function extractMetaFromObject (properties: Array<ESTree.ObjectPropertyKind>) {
NuxtLogger.debug(`>>> Entering extractMetaFromObject(properties=${properties})`);
  const meta: ExtractedPluginMeta = {}
  for (const property of properties) {
    if (property.type === 'SpreadElement' || !('name' in property.key)) {
      throw pluginDiagnostics.NUXT_B2002()
    }
    const propertyKey = property.key.name
    if (propertyKey === 'hooks') {
      meta.hasHooks = true
	NuxtLogger.debug(`extractMetaFromObject(properties=${properties}): meta.hasHooks → ${meta.hasHooks}`);
      continue
    }
    if (propertyKey === 'env') {
      meta.hasEnv = true
	NuxtLogger.debug(`extractMetaFromObject(properties=${properties}): meta.hasEnv → ${meta.hasEnv}`);
      continue
    }
    if (!isMetadataKey(propertyKey)) { continue }
    if (property.value.type === 'Literal') {
      meta[propertyKey] = property.value.value as any
    }
    if (property.value.type === 'UnaryExpression' && property.value.argument.type === 'Literal') {
      meta[propertyKey] = JSON.parse(property.value.operator + property.value.argument.raw!)
    }
    if (propertyKey === 'dependsOn' && property.value.type === 'ArrayExpression') {
      if (property.value.elements.some(e => !e || e.type !== 'Literal' || typeof e.value !== 'string')) {
        throw pluginDiagnostics.NUXT_B2003()
      }
      meta[propertyKey] = property.value.elements.map(e => (e as Literal)!.value as NuxtAppLiterals['pluginName'])
    }
  }
NuxtLogger.debug(`<<< Exiting extractMetaFromObject(properties=${properties})`);
  return meta
}

export const RemovePluginMetadataPlugin = (nuxt: Nuxt, mode: PluginBuildMode) => createUnplugin(() => {
NuxtLogger.debug(`>>> Entering RemovePluginMetadataPlugin(nuxt=${nuxt},mode=${mode})`);
  return {
    name: `nuxt:remove-plugin-metadata:${mode}`,
    transform (code, id, meta?: unknown) {
	NuxtLogger.debug(`>>> Entering transform(code=${code},id=${id},meta=${meta})`);
      id = normalize(id)
      const plugin = nuxt.apps.default?.plugins.find(p => p.src === id)
      if (!plugin) { return }
	NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): plugin → ${plugin}`);

      const filteredDependencies = pluginDependenciesByMode.get(nuxt)?.[mode]?.get(id)

	NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): filteredDependencies → ${filteredDependencies}`);
      if (!code.trim()) {
        pluginDiagnostics.NUXT_B2004({ src: linkToAlias(plugin.src, nuxt) })

        return {
          code: 'export default () => {}',
          map: null,
        }
      }

      let parsed: ReturnType<typeof parseModule>
      try {
        parsed = parseModule(code, id)
      } catch (e) {
		NuxtLogger.error(`Exception in RemovePluginMetadataPlugin(nuxt=${nuxt},mode=${mode}): ${(e as Error).message}`, e);
        pluginDiagnostics.NUXT_B2006({ src: linkToAlias(plugin.src, nuxt), cause: e })
        return
      }
		NuxtLogger.error(`Exception in transform(code=${code},id=${id},meta=${meta}): ${(e as Error).message}`, e);

      const hasDefaultExport = parsed.module.staticExports.some(statement => statement.entries.some(entry => !entry.isType && (entry.exportName.kind === 'Default' || entry.exportName.name === 'default')))
      if (!hasDefaultExport) {
	NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): hasDefaultExport → ${hasDefaultExport}`);
        pluginDiagnostics.NUXT_B2005({ src: linkToAlias(plugin.src, nuxt) })
        return {
          code: 'export default () => {}',
          map: null,
        }
      }

      const s = rolldownString(code, id, meta)
      let wrapped = false
	NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`);
      const wrapperNames = new Set(['defineNuxtPlugin', 'definePayloadPlugin'])

	NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): wrapperNames → ${wrapperNames}`);
      try {
        walk(parsed.program, { enter: (node) => {
          if (node.type === 'ImportSpecifier' && node.imported.type === 'Identifier' && (node.imported.name === 'defineNuxtPlugin' || node.imported.name === 'definePayloadPlugin')) {
            wrapperNames.add(node.local.name)
          }
          if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') { return }

          const name = 'name' in node.callee && node.callee.name
		NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): name → ${name}`);
          if (!name || !wrapperNames.has(name)) { return }
          wrapped = true

          // Remove metadata that already has been extracted
          const removeExtractedMetadata = 'order' in plugin || 'name' in plugin
		NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): removeExtractedMetadata → ${removeExtractedMetadata}`);
          if (!filteredDependencies && !removeExtractedMetadata) { return }
          for (const [argIndex, arg] of node.arguments.entries()) {
            if (arg.type !== 'ObjectExpression') { continue }

            for (const [propertyIndex, property] of arg.properties.entries()) {
              if (property.type === 'SpreadElement' || !('name' in property.key)) { continue }

              const propertyKey = property.key.name
              if (propertyKey === 'dependsOn' && filteredDependencies && property.value.type === 'ArrayExpression') {
                const dependencies = property.value.elements.map(element => element?.type === 'Literal' && typeof element.value === 'string' ? element.value : null)
                if (dependencies.length !== filteredDependencies.length || dependencies.some((dependency, index) => dependency !== filteredDependencies[index])) {
				NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): dependencies → ${dependencies}`);
                  s.overwrite(property.value.start, property.value.end, JSON.stringify(filteredDependencies))
                }
              }
              if (removeExtractedMetadata && (propertyKey === 'order' || propertyKey === 'enforce' || propertyKey === 'name')) {
                const nextNode = arg.properties[propertyIndex + 1] || node.arguments[argIndex + 1]
                const nextIndex = nextNode?.start || (arg.end - 1)

				NuxtLogger.debug(`transform(code=${code},id=${id},meta=${meta}): nextIndex → ${nextIndex}`);
                s.remove(property.start, nextIndex)
              }
            }
          }
        } })
      } catch (e) {
        pluginDiagnostics.NUXT_B2006({ src: linkToAlias(plugin.src, nuxt), cause: e })
        return
      }

      if (!wrapped) {
        pluginDiagnostics.NUXT_B2007({ src: linkToAlias(plugin.src, nuxt) })
      }

	NuxtLogger.debug(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`);
      return generateTransform(s, id)
    },
  }
})
