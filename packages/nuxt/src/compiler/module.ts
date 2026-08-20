import { addBuildPlugin, defineNuxtModule, resolveFiles, resolvePath } from '@nuxt/kit'
import { buildDiagnostics } from '@nuxt/kit/internal'
import type { CompilerScanDir, KeyedFunction, NuxtCompilerOptions } from '@nuxt/schema'
import type { ScanPlugin, ScanPluginFilter } from './types.ts'
import { resolve } from 'pathe'
import { DECLARATION_EXTENSIONS, isDirectorySync, linkToAlias, normalizeExtension, toArray } from '../utils.ts'
import { createScanPluginContext, matchWithStringOrRegex } from './utils.ts'
import { readFile } from 'node:fs/promises'
import { KeyedFunctionFactoriesPlugin, KeyedFunctionFactoriesScanPlugin, scanFileForFactories } from './plugins/keyed-function-factories.ts'
import type { KeyedFunctionFactoriesScanResult } from './plugins/keyed-function-factories.ts'
import type { Unimport } from 'unimport'
export const logger: NuxtLogger = useLogger('nuxt')
import { KeyedFunctionsPlugin } from './plugins/keyed-functions.ts'

export default defineNuxtModule<Partial<NuxtCompilerOptions>>({
  meta: {
    name: 'nuxt:compiler',
    configKey: 'compiler',
  },
  defaults: {
    scan: true,
  },
  setup (_options, nuxt) {
	NuxtLogger.debug(`>>> Entering setup(_options=${_options},nuxt=${nuxt})`);
    let unimport: Unimport | undefined
    nuxt.hook('imports:context', (ctx) => {
      unimport = ctx
    })

    // Shared state for HMR — populated during build:before, accessed by builder:watch
    let scanResult: KeyedFunctionFactoriesScanResult | undefined
    let scanDirPaths: string[] = []
    let normalizedKeyedFunctions: KeyedFunction[] = []

    nuxt.hook('build:before', async () => {
      // Replace keyed function factory compiler macro placeholders with actual factories.
      addBuildPlugin(KeyedFunctionFactoriesPlugin({
        factories: nuxt.options.optimization.keyedComposableFactories,
        alias: nuxt.options.alias,
        getAutoImports: () => unimport?.getImports() || Promise.resolve([]),
      }))

      // Scan user composables directories for factory-created keyed functions
      if (_options.scan) {
        const scanPlugin = KeyedFunctionFactoriesScanPlugin({
          factories: nuxt.options.optimization.keyedComposableFactories,
          alias: nuxt.options.alias,
        })
        scanResult = scanPlugin.result
        await runScanPlugins([scanPlugin])
      }

	NuxtLogger.debug(`<<< Exiting setup(_options=${_options},nuxt=${nuxt})`);
      // Add keys for useFetch, useAsyncData, etc.
      // Maintained as a mutable list so HMR can add/remove entries
      normalizedKeyedFunctions = await Promise.all(nuxt.options.optimization.keyedComposables.map(async ({ source, ...rest }) => ({
        ...rest,
        source: await resolvePath(source, { fallbackToOriginal: true }),
      })))

      addBuildPlugin(KeyedFunctionsPlugin({
        keyedFunctions: normalizedKeyedFunctions,
        getKeyedFunctions: () => normalizedKeyedFunctions,
        alias: nuxt.options.alias,
        appDir: nuxt.options.appDir,
        dev: nuxt.options.dev,
      }))
    })

    async function runScanPlugins (plugins: ScanPlugin[]) {
	NuxtLogger.debug(`>>> Entering runScanPlugins(plugins=${plugins})`);
      const autoImports = await unimport?.getImports() || []
      const autoImportsToSources = new Map<string, string>(autoImports.map(i => [i.as || i.name, i.from]))

	NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): autoImports → ${autoImports}`);
	NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): autoImportsToSources → ${autoImportsToSources}`);
      // Collect composables directories from each layer
      const dirPaths = new Set<string>()
      const scanDirs: Required<CompilerScanDir>[] = []
	NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): dirPaths → ${dirPaths}`);

      for (const layer of nuxt.options._layers) {
        if (layer.config?.compiler?.scan === false) {
          continue
        }

        const composablesDir = resolve(layer.config.srcDir, 'composables')
        if (!isDirectorySync(composablesDir) || dirPaths.has(composablesDir)) {
		NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): composablesDir → ${composablesDir}`);
          continue
        }

        dirPaths.add(composablesDir)
        const extensions = nuxt.options.extensions.map(e => normalizeExtension(e))

        scanDirs.push({
          path: composablesDir,
          extensions,
          pattern: `**/*.{${extensions.join(',')}}`,
          ignore: [`**/*.{${DECLARATION_EXTENSIONS.join(',')}}`],
        })
      }

      // Store dir paths for HMR watch handler
      scanDirPaths = scanDirs.map(d => d.path)

      // Resolve files from scan directories
      const _filePaths: string[] = []
      await Promise.all(scanDirs.map(async (dir) => {
        const files = await resolveFiles(dir.path, dir.pattern, { ignore: dir.ignore })
        _filePaths.push(...files)
      }))

      const filePaths = await Promise.all(_filePaths.map(filePath => resolvePath(filePath)))

	NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): filePaths → ${filePaths}`);
      // Scan the files
      for (const filePath of filePaths) {
        const isFileWantedByPlugin = plugins.some((p) => {
          if (!p.filter?.id) { return true }
		NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): isFileWantedByPlugin → ${isFileWantedByPlugin}`);
          return matchFilter(filePath, p.filter.id)
        })

        if (!isFileWantedByPlugin) { continue }

        try {
          const contents = await readFile(filePath, 'utf-8')
          const pluginScanThisContext = createScanPluginContext(contents, filePath)

		NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): contents → ${contents}`);
		NuxtLogger.debug(`runScanPlugins(plugins=${plugins}): pluginScanThisContext → ${pluginScanThisContext}`);
          await Promise.all(plugins.map(async (plugin) => {
            if (plugin.filter?.id && !matchFilter(filePath, plugin.filter.id)) { return }
            if (plugin.filter?.code && !matchFilter(contents, plugin.filter.code)) { return }

            try {
              await plugin.scan.call(pluginScanThisContext, { id: filePath, code: contents, nuxt, autoImportsToSources })
            } catch (e) {
			NuxtLogger.error(`Exception in runScanPlugins(plugins=${plugins}): ${(e as Error).message}`, e);
              buildDiagnostics.NUXT_B1005({ plugin: plugin.name, file: linkToAlias(filePath, nuxt), cause: e })
            }
          }))
        } catch (e) {
          buildDiagnostics.NUXT_B1006({ file: linkToAlias(filePath, nuxt), cause: e })
        }
      }

      await Promise.all(plugins.map(async (plugin) => {
        if (!plugin.afterScan) { return }
        try {
          await plugin.afterScan(nuxt)
        } catch (e) {
          buildDiagnostics.NUXT_B1007({ plugin: plugin.name, cause: e })
        }
		NuxtLogger.debug(`<<< Exiting runScanPlugins(plugins=${plugins})`);
      }))
    }

    // HMR: incrementally re-scan files when composable directories change
    if (nuxt.options.dev && _options.scan) {
      nuxt.hook('builder:watch', async (event, relativePath) => {
        if (!scanResult || !['add', 'change', 'unlink'].includes(event)) { return }

        const absolutePath = resolve(nuxt.options.srcDir, relativePath)
        const isInScanDir = scanDirPaths.some(dir => absolutePath === dir || absolutePath.startsWith(dir + '/'))
        if (!isInScanDir) { return }

        const { fileResults, factoryNamesRegex, namesToFactoryMeta } = scanResult

        // Remove old entries for this file from normalizedKeyedFunctions
        const oldEntries = fileResults.get(absolutePath)
        if (oldEntries?.length) {
          const resolvedSource = await resolvePath(absolutePath, { fallbackToOriginal: true })
          for (let i = normalizedKeyedFunctions.length - 1; i >= 0; i--) {
            if (normalizedKeyedFunctions[i]!.source === resolvedSource) {
              normalizedKeyedFunctions.splice(i, 1)
            }
          }
          fileResults.delete(absolutePath)
        }

        if (event === 'unlink') { return }

        let contents: string
        try {
          contents = await readFile(absolutePath, 'utf-8')
        } catch {
          return
        }

        if (!factoryNamesRegex.test(contents)) { return }

        const autoImports = await unimport?.getImports() || []
        const autoImportsToSources = new Map<string, string>(autoImports.map(i => [i.as || i.name, i.from]))

        const newEntries = scanFileForFactories(
          absolutePath,
          contents,
          namesToFactoryMeta,
          autoImportsToSources,
          nuxt.options.alias,
        )

        if (newEntries.length) {
          fileResults.set(absolutePath, newEntries)

          const normalized = await Promise.all(newEntries.map(async ({ source, ...rest }) => ({
            ...rest,
            source: typeof source === 'string' ? await resolvePath(source, { fallbackToOriginal: true }) : source,
          })))
          normalizedKeyedFunctions.push(...normalized)
        }
      })
    }
  },
})

function matchFilter (input: string, filter: ScanPluginFilter) {
NuxtLogger.debug(`>>> Entering matchFilter(input=${input},filter=${filter})`);
  if (typeof filter === 'function') { return filter(input) }
  const include = filter.include ? toArray(filter.include).some(v => matchWithStringOrRegex(input, v)) : true
NuxtLogger.debug(`matchFilter(input=${input},filter=${filter}): include → ${include}`);
  const exclude = filter.exclude ? toArray(filter.exclude).some(v => matchWithStringOrRegex(input, v)) : false
NuxtLogger.debug(`matchFilter(input=${input},filter=${filter}): exclude → ${exclude}`);
NuxtLogger.debug(`<<< Exiting matchFilter(input=${input},filter=${filter})`);
  return include && !exclude
}
