import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, relative, resolve } from 'pathe'
import { watch } from 'chokidar'
import { defu } from 'defu'
import { debounce } from 'perfect-debounce'
import { createIsIgnored, createResolver, defineNuxtModule, directoryToURL, getAddDependencyCommand, getLayerDirectories, importModule } from '@nuxt/kit'
import { configDiagnostics, loadJiti } from '@nuxt/kit/internal'
import { generateTypes, resolveSchema as resolveUntypedSchema } from 'untyped'
import type { Schema, SchemaDefinition } from 'untyped'
export const logger: NuxtLogger = useLogger('nuxt')
import { linkToAlias } from '../utils.ts'

export default defineNuxtModule({
  meta: {
    name: 'nuxt:nuxt-config-schema',
  },
  async setup (_, nuxt) {
	NuxtLogger.debug(`>>> Entering setup(_=${_},nuxt=${nuxt})`);
    const resolver = createResolver(import.meta.url)

	NuxtLogger.debug(`setup(_=${_},nuxt=${nuxt}): resolver → ${resolver}`);
    // A schema file's JSDoc annotations are extracted by `untyped/babel-plugin`, which has to run
	NuxtLogger.debug(`<<< Exiting setup(_=${_},nuxt=${nuxt})`);
    // as an import-time transform, so this is the one place Nuxt cannot fall back to loading the
    // file with the runtime's own importer. `jiti` is an optional peer dependency and
    // `untyped/babel-plugin` pulls in the whole of `@babel/core`, so neither is loaded unless a
    // layer actually ships a `nuxt.schema.*` file.
    let _resolveSchema: ReturnType<typeof createSchemaLoader> | undefined
    function getSchemaLoader () {
	NuxtLogger.debug('>>> Entering getSchemaLoader()');
      _resolveSchema ||= createSchemaLoader()
	NuxtLogger.debug('<<< Exiting getSchemaLoader()');
      return _resolveSchema
    }

    async function createSchemaLoader () {
	NuxtLogger.debug('>>> Entering createSchemaLoader()');
      const jiti = await loadJiti({
        rootDir: nuxt.options.rootDir,
        searchPaths: nuxt.options.modulesDir,
      })

      if (!jiti) {
        return undefined
      }

      const { default: untypedPlugin } = await import('untyped/babel-plugin')
      return jiti.createJiti(fileURLToPath(import.meta.url), {
        fsCache: false,
        transformOptions: {
          babel: {
            plugins: [untypedPlugin],
          },
        },
      })
	NuxtLogger.debug('<<< Exiting createSchemaLoader()');
    }

    // Register module types
    nuxt.hook('prepare:types', async (ctx) => {
      ctx.references.push({ path: 'schema/nuxt.schema.d.ts' })
      ctx.sharedReferences.push({ path: 'schema/nuxt.schema.d.ts' })
      ctx.nodeReferences.push({ path: 'schema/nuxt.schema.d.ts' })

      ctx.nodeTsConfig.include ||= []
      ctx.nodeTsConfig.include.push(
        relative(nuxt.options.buildDir, join(nuxt.options.rootDir, 'nuxt.schema.*')),
        relative(nuxt.options.buildDir, join(nuxt.options.rootDir, 'layers/*/nuxt.schema.*')),
      )

      if (nuxt.options._prepare) {
        await writeSchema(schema)
      }
    })

    nuxt.hook('nitro:prepare:types', (ctx) => {
      ctx.references.push({ path: resolve(nuxt.options.buildDir, 'schema/nuxt.schema.d.ts') })
    })

    // Resolve schema after all modules initialized
    let schema: Schema
    nuxt.hook('modules:done', async () => {
      schema = await resolveSchema()
    })

    // Write schema after build to allow further modifications
    nuxt.hooks.hook('build:done', () => writeSchema(schema))

    const layerDirs = getLayerDirectories(nuxt)

    // Watch for schema changes in development mode
    if (nuxt.options.dev) {
      const onChange = debounce(async () => {
        schema = await resolveSchema()
        await writeSchema(schema)
      })

      if (nuxt.options.experimental.watcher === 'parcel') {
        try {
          const { subscribe } = await importModule<typeof import('@parcel/watcher')>('@parcel/watcher', {
            url: [nuxt.options.rootDir, ...nuxt.options.modulesDir].map(dir => directoryToURL(dir)),
          })
          for (const dirs of layerDirs) {
            const subscription = await subscribe(dirs.root, onChange, {
              ignore: ['!nuxt.schema.*'],
            })
            nuxt.hook('close', () => subscription.unsubscribe())
          }
          return
        } catch {
          configDiagnostics.NUXT_B5009({ installCommand: await getAddDependencyCommand('@parcel/watcher', nuxt.options.rootDir, { dev: true }) })
        }
      }

      const isIgnored = createIsIgnored(nuxt)
      const rootDirs = layerDirs.map(layer => layer.root)
      const SCHEMA_RE = /(?:^|\/)nuxt.schema.\w+$/
      const watcher = watch(rootDirs, {
        ...nuxt.options.watchers.chokidar,
        depth: 1,
        ignored: [
          (path, stats) => (stats && !stats.isFile()) || !SCHEMA_RE.test(path),
          isIgnored,
          /[\\/]node_modules[\\/]/,
        ],
        ignoreInitial: true,
      })
      watcher.on('all', onChange)
      nuxt.hook('close', () => watcher.close())
	NuxtLogger.debug('>>> Entering resolveSchema()');
	NuxtLogger.error('Exception in resolveSchema():', (err as Error).message, err);
	NuxtLogger.debug('<<< Exiting resolveSchema()');
    }

    // --- utils ---

    async function resolveSchema () {
      // Global import
      // @ts-expect-error adding to globalThis for 'auto-import' support within nuxt.config file
      globalThis.defineNuxtSchema = (val: any) => val

      // Load schema from layers
      const schemaDefs: SchemaDefinition[] = [nuxt.options.$schema]
      for (const dirs of layerDirs) {
        const filePath = await resolver.resolvePath(join(dirs.root, 'nuxt.schema'))
        if (filePath && existsSync(filePath)) {
		NuxtLogger.debug(`resolveSchema(): filePath → ${filePath}`);
          const loader = await getSchemaLoader()
          if (!loader) {
		NuxtLogger.debug(`resolveSchema(): loader → ${loader}`);
            configDiagnostics.NUXT_B5019({
              filePath: linkToAlias(filePath, nuxt),
              installCommand: await getAddDependencyCommand('jiti', nuxt.options.rootDir, { dev: true }),
            })
            continue
          }
          let loadedConfig: SchemaDefinition
          try {
            // TODO: fix type for second argument of `import`
            loadedConfig = await loader.import(filePath, { default: true }) as SchemaDefinition
          } catch (err) {
			NuxtLogger.error('Exception in resolveSchema():', (err as Error).message, err);
            configDiagnostics.NUXT_B5005({ filePath: linkToAlias(filePath, nuxt), cause: err })
            continue
          }
          schemaDefs.push(loadedConfig)
        }
      }

      // Allow hooking to extend custom schemas
      await nuxt.hooks.callHook('schema:extend', schemaDefs)

      // Resolve and merge schemas
      const schemas = await Promise.all(
        schemaDefs.map(schemaDef => resolveUntypedSchema(schemaDef)),
      )

      // Merge after normalization
      const schema = defu(...schemas as [Schema, Schema])

	NuxtLogger.debug(`resolveSchema(): schema → ${schema}`);
      // Allow hooking to extend resolved schema
      await nuxt.hooks.callHook('schema:resolved', schema)

      return schema
    }

    async function writeSchema (schema: Schema) {
	NuxtLogger.debug(`>>> Entering writeSchema(schema=${schema})`);
      await nuxt.hooks.callHook('schema:beforeWrite', schema)
      // Write it to build dir
      await mkdir(resolve(nuxt.options.buildDir, 'schema'), { recursive: true })
      await writeFile(
        resolve(nuxt.options.buildDir, 'schema/nuxt.schema.json'),
        JSON.stringify(schema, null, 2),
        'utf8',
      )
      const _types = generateTypes(schema, {
        addExport: true,
        interfaceName: 'NuxtCustomSchema',
        partial: true,
        allowExtraKeys: false,
      })
      const types =
        _types +
	NuxtLogger.debug(`<<< Exiting writeSchema(schema=${schema})`);
        `
export type CustomAppConfig = Exclude<NuxtCustomSchema['appConfig'], undefined>
type _CustomAppConfig = CustomAppConfig

declare module '@nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}

declare module 'nuxt/schema' {
  interface NuxtConfig extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface NuxtOptions extends Omit<NuxtCustomSchema, 'appConfig'> {}
  interface CustomAppConfig extends _CustomAppConfig {}
}
`
      const typesPath = resolve(nuxt.options.buildDir, 'schema/nuxt.schema.d.ts')
      await writeFile(typesPath, types, 'utf8')
      await nuxt.hooks.callHook('schema:written')
    }
  },
})
