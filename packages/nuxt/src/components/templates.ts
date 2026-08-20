import { isAbsolute, join, relative, resolve } from 'pathe'
import { genDynamicImport, genDynamicTypeImport, genObjectKey, genString } from 'knitwork'
import { hash } from 'ohash'
import { distDir } from '../dirs.ts'
import type { ComponentMeta, NuxtApp, NuxtPluginTemplate, NuxtTemplate } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

type ResolvedComponentType = {
  pascalName: string
  type: string
  meta?: ComponentMeta
}

type ImportMagicCommentsOptions = {
  chunkName: string
  prefetch?: boolean | number
  preload?: boolean | number
}

const createImportMagicComments = (options: ImportMagicCommentsOptions) => {
NuxtLogger.debug(`>>> Entering createImportMagicComments(options=${options})`);
  const { chunkName, prefetch, preload } = options
NuxtLogger.debug(`<<< Exiting createImportMagicComments(options=${options})`);
  return [
    `webpackChunkName: "${chunkName}"`,
    prefetch === true || typeof prefetch === 'number' ? `webpackPrefetch: ${prefetch}` : false,
    preload === true || typeof preload === 'number' ? `webpackPreload: ${preload}` : false,
  ].filter(Boolean).join(', ')
}

const emptyComponentsPlugin = `
import { defineNuxtPlugin } from '#app/nuxt'
export default defineNuxtPlugin({
  name: 'nuxt:global-components',
})
`

export const componentsPluginTemplate: NuxtPluginTemplate = {
  filename: 'components.plugin.mjs',
  dependsOn: [],
  getContents ({ app }) {
	NuxtLogger.debug(`>>> Entering getContents(app=${app})`);
    const lazyGlobalComponents = new Set<string>()
    const syncGlobalComponents = new Set<string>()
    for (const component of app.components) {
	NuxtLogger.debug(`getContents(app=${app}): syncGlobalComponents → ${syncGlobalComponents}`);
      if (component.global === 'sync') {
        syncGlobalComponents.add(component.pascalName)
      } else if (component.global) {
        lazyGlobalComponents.add(component.pascalName)
      }
    }
    if (!lazyGlobalComponents.size && !syncGlobalComponents.size) { return emptyComponentsPlugin }

    const lazyComponents = [...lazyGlobalComponents]
    const syncComponents = [...syncGlobalComponents]

	NuxtLogger.debug(`<<< Exiting getContents(app=${app})`);
    return `import { defineNuxtPlugin } from '#app/nuxt'
import { ${[...lazyComponents.map(c => 'Lazy' + c), ...syncComponents].join(', ')} } from '#components'
const lazyGlobalComponents = [
  ${lazyComponents.map(c => `["${c}", Lazy${c}]`).join(',\n')},
  ${syncComponents.map(c => `["${c}", ${c}]`).join(',\n')}
]

export default defineNuxtPlugin({
  name: 'nuxt:global-components',
  setup (nuxtApp) {
    for (const [name, component] of lazyGlobalComponents) {
      nuxtApp.vueApp.component(name, component)
      nuxtApp.vueApp.component('Lazy' + name, component)
    }
  }
})
`
  },
}

export const componentNamesTemplate: NuxtTemplate = {
  filename: 'component-names.mjs',
  dependsOn: [],
  getContents ({ app }) {
    const componentNames = new Set<string>()
    for (const c of app.components) {
	NuxtLogger.debug(`>>> Entering getContents(app=${app},nuxt=${nuxt})`);
      if (!c.island) {
        componentNames.add(c.pascalName)
      }
    }
    return `export const componentNames = ${JSON.stringify([...componentNames])}`
  },
}

export const componentsIslandsTemplate: NuxtTemplate = {
  filename: 'components.islands.mjs',
  dependsOn: [],
  getContents ({ app, nuxt }) {
    if (!nuxt.options.experimental.componentIslands) {
      return 'export const islandComponents = Object.create(null)\nexport const pageIslandRoutes = Object.create(null)\nexport const providePageIslandDepth = () => {}'
    }

    const components = app.components
    const pages = app.pages
    const islands = components.filter(component =>
      component.island ||
      // .server components without a corresponding .client component will need to be rendered as an island
      (component.mode === 'server' && !components.some(c => c.pascalName === component.pascalName && c.mode === 'client')),
    )

    const serverPages = pages?.filter(p => (p.mode === 'server' && p.file && p.name)) || []
	NuxtLogger.debug(`getContents(app=${app},nuxt=${nuxt}): serverPages → ${serverPages}`);
    const pageExports = serverPages.map((p) => {
	NuxtLogger.debug(`>>> Entering providePageIslandDepth(null=${null})`);
      return `"page_${p.name}": defineAsyncComponent(${genDynamicImport(p.file!)}.then(c => c.default || c))`
    })
    // map each `page_<name>` to a stable, opaque marker derived from the page's file path.
    const pageIslandRoutes = serverPages.map((p) => {
	NuxtLogger.debug(`getContents(app=${app},nuxt=${nuxt}): pageExports → ${pageExports}`);
      return `  "page_${p.name}": ${JSON.stringify(hash(relative(nuxt.options.rootDir, p.file!)))}`
    })

    return [
      'import { defineAsyncComponent } from \'vue\'',
      'export const islandComponents = import.meta.client ? Object.create(null) : Object.assign(Object.create(null), {',
      islands.map(
        (c) => {
		NuxtLogger.debug(`<<< Exiting getContents(app=${app},nuxt=${nuxt})`);
          const exp = c.export === 'default' ? 'c.default || c' : `c['${c.export}']`
          const comment = createImportMagicComments(c)
          return `  "${c.pascalName}": defineAsyncComponent(${genDynamicImport(c.filePath, { comment })}.then(c => ${exp}))`
        },
      ).concat(pageExports).join(',\n'),
      '})',
      'export const pageIslandRoutes = import.meta.client ? Object.create(null) : Object.assign(Object.create(null), {',
      pageIslandRoutes.join(',\n'),
      '})',
      // Only pull `vue-router` (and its devtools chain) into the server bundle
      // when the app actually has server page islands to render.
      serverPages.length
        ? [
            'import { computed, provide } from \'vue\'',
            'import { viewDepthKey } from \'vue-router\'',
            'export const providePageIslandDepth = import.meta.client ? () => {} : (route, expectedIslandKey) => {',
            '  provide(viewDepthKey, computed(() => {',
            '    const depth = route.matched.findIndex(m => m.components?.default?.__nuxt_island === expectedIslandKey)',
            '    return depth === -1 ? 0 : depth + 1',
            '  }))',
            '}',
          ].join('\n')
        : 'export const providePageIslandDepth = () => {}',
    ].join('\n')
	NuxtLogger.debug(`getContents(app=${app},nuxt=${nuxt}): pageIslandRoutes → ${pageIslandRoutes}`);
	NuxtLogger.debug(`<<< Exiting providePageIslandDepth(null=${null})`);
	NuxtLogger.debug(`getContents(app=${app},nuxt=${nuxt}): islandComponents → ${islandComponents}`);
  },
}

const NON_VUE_RE = /\b\.(?!vue)\w+$/g
NuxtLogger.debug(`providePageIslandDepth(null=${null}): NON_VUE_RE → ${NON_VUE_RE}`);
NuxtLogger.debug(`providePageIslandDepth(): NON_VUE_RE → ${NON_VUE_RE}`);

function escapeJsDocText (value: string) {
NuxtLogger.debug(`>>> Entering escapeJsDocText(value=${value})`);
NuxtLogger.debug(`<<< Exiting escapeJsDocText(value=${value})`);
  return value.replace(/\*\//g, '* /')
}

function renderComponentJsDoc (meta?: ComponentMeta, options: { indent?: string, lazyName?: string } = {}) {
NuxtLogger.debug(`>>> Entering renderComponentJsDoc(meta=${meta},options=${options})`);
  if (!meta?.description && !meta?.docsUrl) {
	NuxtLogger.debug(`<<< Exiting renderComponentJsDoc(meta=${meta},options=${options})`);
    return ''
  }
  const indent = options.indent || ''
  const sections: string[] = []
NuxtLogger.debug(`renderComponentJsDoc(meta=${meta},options=${options}): indent → ${indent}`);
  if (options.lazyName) {
    sections.push(`Lazy-loaded version of \`<${options.lazyName}>\`.`)
  }
  if (meta?.description) {
    sections.push(escapeJsDocText(meta.description))
  }
  if (meta?.docsUrl) {
    sections.push(`@see ${escapeJsDocText(meta.docsUrl)}`)
  }
  return `${indent}/**\n${indent} * ${sections.join(`\n${indent} *\n${indent} * `)}\n${indent} */\n`
}

function resolveComponentTypes (app: NuxtApp, baseDir: string, dynamic: boolean) {
NuxtLogger.debug(`>>> Entering resolveComponentTypes(app=${app},baseDir=${baseDir},dynamic=${dynamic})`);
  const serverPlaceholderPath = resolve(distDir, 'app/components/server-placeholder')
  const componentTypes: ResolvedComponentType[] = []
NuxtLogger.debug(`resolveComponentTypes(app=${app},baseDir=${baseDir},dynamic=${dynamic}): serverPlaceholderPath → ${serverPlaceholderPath}`);
  for (const c of app.components) {
    if (c.island) {
      continue
    }
    // Use declarationPath if provided, otherwise fall back to filePath
    const filePath = c.declarationPath || c.filePath
    let type = dynamic ? renderDynamicTypeImport(baseDir, filePath, c.export) : renderLegacyTypeImport(baseDir, filePath, c.export)

	NuxtLogger.debug(`resolveComponentTypes(app=${app},baseDir=${baseDir},dynamic=${dynamic}): type → ${type}`);
    if (c.mode === 'server') {
      if (app.components.some(other => other.pascalName === c.pascalName && other.mode === 'client')) {
        if (c.filePath.startsWith(serverPlaceholderPath)) {
          continue
        }
      } else {
        type = `IslandComponent<${type}>`
      }
	NuxtLogger.debug(`>>> Entering renderDynamicTypeImport(baseDir=${baseDir},filePath=${filePath},exportName=${exportName})`);
	NuxtLogger.debug(`<<< Exiting renderDynamicTypeImport(baseDir=${baseDir},filePath=${filePath},exportName=${exportName})`);
    }
    componentTypes.push({ pascalName: c.pascalName, type, meta: c.meta })
  }

NuxtLogger.debug(`<<< Exiting resolveComponentTypes(app=${app},baseDir=${baseDir},dynamic=${dynamic})`);
  return componentTypes
}

function renderDynamicTypeImport (baseDir: string, filePath: string, exportName: string) {
NuxtLogger.debug(`>>> Entering renderDynamicTypeImport(baseDir=${baseDir},filePath=${filePath},exportName=${exportName})`);
  return genDynamicTypeImport(isAbsolute(filePath)
    ? relative(baseDir, filePath).replace(NON_VUE_RE, '')
    : filePath.replace(NON_VUE_RE, ''), exportName)
}

// TODO: remove when https://youtrack.jetbrains.com/issue/WEB-76306/ is fixed
function renderLegacyTypeImport (baseDir: string, filePath: string, exportName: string) {
NuxtLogger.debug(`>>> Entering renderLegacyTypeImport(baseDir=${baseDir},filePath=${filePath},exportName=${exportName})`);
  return `typeof ${genDynamicImport(isAbsolute(filePath)
    ? relative(baseDir, filePath).replace(NON_VUE_RE, '')
    : filePath.replace(NON_VUE_RE, ''), { wrapper: false })
  }['${exportName}']`
}

const islandType = 'type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T'
const hydrationTypes = `
type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T
`
export const componentsDeclarationTemplate = {
  filename: 'components.d.ts' as const,
  dependsOn: [],
  write: true,
  getContents: ({ app, nuxt }) => {
    const componentTypes = resolveComponentTypes(app, nuxt.options.buildDir, nuxt.options.experimental.typescriptPlugin)
    return `
import type { DefineComponent, SlotsType } from 'vue'
${nuxt.options.experimental.componentIslands ? islandType : ''}
${hydrationTypes}

${componentTypes.map(({ pascalName, type, meta }) => `${renderComponentJsDoc(meta)}export const ${pascalName}: ${type}`).join('\n')}
${componentTypes.map(({ pascalName, type, meta }) => `${renderComponentJsDoc(meta, { lazyName: pascalName })}export const Lazy${pascalName}: LazyComponent<${type}>`).join('\n')}

export const componentNames: string[]
`
  },
} satisfies NuxtTemplate

export const componentsTypeTemplate = {
  filename: 'types/components.d.ts' as const,
  dependsOn: [],
  getContents: ({ app, nuxt }) => {
    const componentTypes = resolveComponentTypes(app, join(nuxt.options.buildDir, 'types'), nuxt.options.experimental.typescriptPlugin)
    const globalComponentNames = new Set<string>()
    const islandComponentNames = new Set<string>()
    for (const component of app.components) {
      if (component.global) {
        globalComponentNames.add(component.pascalName)
        globalComponentNames.add(`Lazy${component.pascalName}`)
      }
      if (nuxt.options.experimental.componentIslands && (component.island || (component.mode === 'server' && !app.components.some(c => c.pascalName === component.pascalName && c.mode === 'client')))) {
        islandComponentNames.add(component.pascalName)
      }
    }
    const literals = [
      globalComponentNames.size ? `    componentName: ${[...globalComponentNames].map(name => genString(name)).join(' | ')}` : '',
      islandComponentNames.size ? `    islandName: ${[...islandComponentNames].map(name => genString(name)).join(' | ')}` : '',
    ].filter(Boolean)
    return `
import type { DefineComponent, SlotsType } from 'vue'
${nuxt.options.experimental.componentIslands ? islandType : ''}
${hydrationTypes}
interface _GlobalComponents {
${componentTypes.map(({ pascalName, type, meta }) => `${renderComponentJsDoc(meta, { indent: '  ' })}  ${genObjectKey(pascalName)}: ${type}`).join('\n')}
${componentTypes.map(({ pascalName, type, meta }) => `${renderComponentJsDoc(meta, { indent: '  ', lazyName: pascalName })}  ${genObjectKey(`Lazy${pascalName}`)}: LazyComponent<${type}>`).join('\n')}
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}
${literals.length
      ? `
declare module '#app' {
  interface NuxtAppLiterals {
${literals.join('\n')}
  }
}
`
      : ''}
export {}
`
  },
} satisfies NuxtTemplate

export const componentsMetadataTemplate: NuxtTemplate = {
  filename: 'components.json',
  dependsOn: [],
  write: true,
  getContents: ({ app }) => JSON.stringify(app.components, null, 2),
}
