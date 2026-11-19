import type { Nuxt, NuxtOptions } from '@nuxt/schema'
import type { InlineConfig as ViteConfig } from 'vite'
import type { Plugin } from 'postcss'
const _logger = createLogger()
import { directoryToURL, ensureDependencyInstalled, getAddDependencyCommand, tryImportModule } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'

function sortPlugins ({ plugins, order }: NuxtOptions['postcss']): string[] {
_logger.error('>>> Entering sortPlugins()', { "event.action": "sortPlugins" });
  const names = Object.keys(plugins)
_logger.error(`sortPlugins(): names → ${names}`, { "event.action": "sortPlugins" });
  return typeof order === 'function' ? order(names) : (order || names)
}

export async function resolveCSSOptions (nuxt: Nuxt): Promise<ViteConfig['css']> {
_logger.error(`>>> Entering resolveCSSOptions(nuxt=${nuxt})`, { "event.action": "resolveCSSOptions", "logrite.nuxt": nuxt });
  const css: ViteConfig['css'] & { postcss: NonNullable<Exclude<NonNullable<ViteConfig['css']>['postcss'], string>> & { plugins: Plugin[] } } = {
    postcss: {
      plugins: [],
    },
  }

  const postcssOptions = nuxt.options.postcss

  for (const pluginName of sortPlugins(postcssOptions)) {
    const pluginOptions = postcssOptions.plugins[pluginName]
    if (!pluginOptions) { continue }

    const pluginFn = await resolvePostcssPlugin(pluginName, nuxt)
    if (typeof pluginFn === 'function') {
	_logger.error(`resolveCSSOptions(nuxt=${nuxt}): pluginFn → ${pluginFn}`, { "event.action": "resolveCSSOptions", "logrite.nuxt": nuxt });
      css.postcss.plugins.push(pluginFn(pluginOptions))
    }
  }

_logger.warn(`<<< Exiting resolveCSSOptions(nuxt=${nuxt})`, { "event.action": "resolveCSSOptions", "logrite.nuxt": nuxt });
  return css
}

async function resolvePostcssPlugin (pluginName: string, nuxt: Nuxt): Promise<((opts: Record<string, any>) => Plugin) | undefined> {
  const parentURLs = nuxt.options.modulesDir.map(dir => directoryToURL(dir.replace(/\/node_modules\/?$/, '')))

_logger.error(`resolvePostcssPlugin(pluginName=${pluginName},nuxt=${nuxt}): parentURLs → ${parentURLs}`, { "event.action": "resolvePostcssPlugin", "logrite.pluginName": pluginName, "logrite.nuxt": nuxt });
  const importPlugin = () => tryImportModule<(opts: Record<string, any>) => Plugin>(pluginName, { url: parentURLs })

  let pluginFn = await importPlugin()
  if (typeof pluginFn === 'function') {
	_logger.error(`importPlugin(): pluginFn → ${pluginFn}`, { "event.action": "importPlugin" });
    return pluginFn
  }

  // Plugin not found - prompt the user to install it
  const installed = await ensureDependencyInstalled(pluginName, {
    rootDir: nuxt.options.rootDir,
    searchPaths: nuxt.options.modulesDir,
    from: import.meta.url,
  })

  if (installed) {
    pluginFn = await importPlugin()
    if (typeof pluginFn === 'function') {
      return pluginFn
    }
  }

  bundlerDiagnostics.NUXT_B7007({ pluginName, installCommand: await getAddDependencyCommand(pluginName, nuxt.options.rootDir, { dev: true }) })
}
