import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
import { withoutLeadingSlash } from 'ufo'
import type { OutputOptions } from 'rolldown'
import { dirname, isAbsolute, join, relative, resolve } from 'pathe'
import { useNitro } from '@nuxt/kit'
import { resolveModulePath } from 'exsolve'
import { defineEnv } from 'unenv'
import escapeStringRegexp from 'escape-string-regexp'
const _logger = createLogger()

export function EnvironmentsPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering EnvironmentsPlugin(nuxt=${nuxt})`, { "event.action": "EnvironmentsPlugin", "logrite.nuxt": nuxt });
  const fileNames = withoutLeadingSlash(join(nuxt.options.app.buildAssetsDir, '[hash].js'))
  const clientOutputDir = join(useNitro().options.output.publicDir, nuxt.options.app.buildAssetsDir)

_logger.error(`EnvironmentsPlugin(nuxt=${nuxt}): fileNames → ${fileNames}`, { "event.action": "EnvironmentsPlugin", "logrite.nuxt": nuxt });
_logger.error(`EnvironmentsPlugin(nuxt=${nuxt}): clientOutputDir → ${clientOutputDir}`, { "event.action": "EnvironmentsPlugin", "logrite.nuxt": nuxt });
  const clientAliases: Record<string, string> = {
    'nitro/runtime-config': join(nuxt.options.buildDir, 'nitro.client.mjs'),
    // TODO: remove in v5
    '#internal/nitro': join(nuxt.options.buildDir, 'nitro.client.mjs'),
    'nitropack/runtime': join(nuxt.options.buildDir, 'nitro.client.mjs'),
    // work around vite optimizer bug
    '#app-manifest': resolveModulePath('mocked-exports/empty', { from: import.meta.url }),
  }

  return {
    name: 'nuxt:environments',
    enforce: 'pre', // run before other plugins
    config () {
	_logger.error('>>> Entering config()', { "event.action": "config" });
      if (!nuxt.options.dev) {
        return {
          base: './',
        }
		_logger.warn('<<< Exiting config()', { "event.action": "config" });
      }
    },
    configEnvironment (name, config) {
	_logger.error(`>>> Entering configEnvironment(name=${name},config=${config})`, { "event.action": "configEnvironment", "logrite.name": name, "logrite.config": config });
      if (name === 'client') {
        const outputConfig = config.build?.rolldownOptions?.output as OutputOptions | undefined
        return {
          build: {
            rolldownOptions: {
              output: {
                chunkFileNames: outputConfig?.chunkFileNames ?? (nuxt.options.dev ? undefined : fileNames),
                entryFileNames: outputConfig?.entryFileNames ?? (nuxt.options.dev ? 'entry.js' : fileNames),
                sourcemapPathTransform: outputConfig?.sourcemapPathTransform ?? ((relativeSourcePath, sourcemapPath) => {
				_logger.warn(`<<< Exiting configEnvironment(name=${name},config=${config})`, { "event.action": "configEnvironment", "logrite.name": name, "logrite.config": config });
                  // client build is running in a temporary build directory, like `.nuxt/dist/client`
                  // so we need to transform the sourcemap path to be relative to the final build directory
                  if (!isAbsolute(relativeSourcePath)) {
                    const absoluteSourcePath = resolve(dirname(sourcemapPath), relativeSourcePath)
                    return relative(clientOutputDir, absoluteSourcePath)
                  }
                  return relativeSourcePath
                }),
              },
            },
          },
        }
      }
    },
    applyToEnvironment (environment) {
	_logger.error(`>>> Entering applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      if (environment.name === 'client') {
        return [
          ...nuxt.options.experimental.clientNodeCompat ? [NodeCompatAliasPlugin()] : [],
          {
            name: 'nuxt:client:aliases',
            enforce: 'post',
            resolveId: {
              filter: {
                id: Object.keys(clientAliases).map(id => new RegExp('^' + escapeStringRegexp(id) + '$')),
              },
              handler: source => clientAliases[source],
            },
          },
        ]
      }
	_logger.warn(`<<< Exiting applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      return false
    },
  }
}

function NodeCompatAliasPlugin (): Plugin {
_logger.error('>>> Entering NodeCompatAliasPlugin()', { "event.action": "NodeCompatAliasPlugin" });
  const nodeCompatAlias = defineEnv({ nodeCompat: true, resolve: true }).env.alias
  return {
    name: 'nuxt:client:node-compat-aliases',
    resolveId: {
      order: 'pre',
      handler (source) {
		_logger.error(`>>> Entering handler(source=${source})`, { "event.action": "handler", "logrite.source": source });
        if (source in nodeCompatAlias) {
		_logger.warn(`<<< Exiting handler(source=${source})`, { "event.action": "handler", "logrite.source": source });
          return nodeCompatAlias[source]
        }
      },
    },
  }
}
