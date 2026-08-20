import type { Nuxt, NuxtOptions } from '@nuxt/schema'
import type { InlineConfig as ViteConfig } from 'vite'
import type { Plugin } from 'postcss'
const _logger = createLogger()
import { directoryToURL, ensureDependencyInstalled, getAddDependencyCommand, tryImportModule } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'

function sortPlugins ({ plugins, order }: NuxtOptions['postcss']): string[] {
_logger.debug(`>>> Entering sortPlugins(plugins=${plugins},order=${order})`);
  const names = Object.keys(plugins)
_logger.debug(`sortPlugins(plugins=${plugins},order=${order}): names → ${names}`);
_logger.debug(`<<< Exiting sortPlugins(plugins=${plugins},order=${order})`);
  return typeof order === 'function' ? order(names) : (order || names)
}

export async function resolveCSSOptions (nuxt: Nuxt): Promise<ViteConfig['css']> {
  const css: ViteConfig['css'] & { postcss: NonNullable<Exclude<NonNullable<ViteConfig['css']>['postcss'], string>> & { plugins: Plugin[] } } = {
    postcss: {
      plugins: [],
    },
  }

  const postcssOptions = nuxt.options.postcss

  for (const pluginName of sortPlugins(postcssOptions)) {
	_logger.debug(`>>> Entering resolveCSSOptions(nuxt=${nuxt})`);
    const pluginOptions = postcssOptions.plugins[pluginName]
    if (!pluginOptions) { continue }

    const pluginFn = await resolvePostcssPlugin(pluginName, nuxt)
    if (typeof pluginFn === 'function') {
	_logger.debug(`resolveCSSOptions(nuxt=${nuxt}): pluginFn → ${pluginFn}`);
      css.postcss.plugins.push(pluginFn(pluginOptions))
	_logger.debug(`resolvePostcssPlugin(pluginName=${pluginName},nuxt=${nuxt}): pluginFn → ${pluginFn}`);
	_logger.debug(`<<< Exiting resolveCSSOptions(nuxt=${nuxt})`);
    }
  }

  return css
}

async function resolvePostcssPlugin (pluginName: string, nuxt: Nuxt): Promise<((opts: Record<string, any>) => Plugin) | undefined> {
  const parentURLs = nuxt.options.modulesDir.map(dir => directoryToURL(dir.replace(/\/node_modules\/?$/, '')))

_logger.debug(`resolvePostcssPlugin(pluginName=${pluginName},nuxt=${nuxt}): parentURLs → ${parentURLs}`);
  const importPlugin = () => tryImportModule<(opts: Record<string, any>) => Plugin>(pluginName, { url: parentURLs })

  let pluginFn = await importPlugin()
  if (typeof pluginFn === 'function') {
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
