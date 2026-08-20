import { type UnpluginOptions, createUnplugin } from 'unplugin'
import { resolveAlias } from '@nuxt/kit'
import { normalize } from 'pathe'
import { generateTransform, rolldownString } from 'rolldown-string'
import type { NuxtConfigLayer } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

interface LayerAliasingOptions {
  root: string
  dev: boolean
  layers: NuxtConfigLayer[]
}

const ALIAS_RE = /(?<=['"])[~@]{1,2}(?=\/)/g
const ALIAS_RE_SINGLE = /(?<=['"])[~@]{1,2}(?=\/)/
const ALIAS_ID_RE = /^[~@]{1,2}\//
const CSS_LANG_RE = /\.(?:css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:\?|$)/

export const LayerAliasingPlugin = (options: LayerAliasingOptions) => createUnplugin((_options, meta) => {
NuxtLogger.debug(`>>> Entering LayerAliasingPlugin(options=${options})`);
  const aliases: Record<string, Record<string, string>> = {}
  for (const layer of options.layers) {
    const srcDir = layer.config.srcDir || layer.cwd
    const rootDir = layer.config.rootDir || layer.cwd

    aliases[srcDir] = {
      '~': layer.config?.alias?.['~'] || srcDir,
      '@': layer.config?.alias?.['@'] || srcDir,
      '~~': layer.config?.alias?.['~~'] || rootDir,
      '@@': layer.config?.alias?.['@@'] || rootDir,
    }
  }
  const layers = Object.keys(aliases).sort((a, b) => b.length - a.length)

NuxtLogger.debug(`LayerAliasingPlugin(options=${options}): layers → ${layers}`);
  // On vite, JS imports are handled by the `resolveId` hook below; the
  // textual rewrite is only needed for CSS files, whose `@import` / `url()`
  // resolution skips plugin `resolveId`. Webpack/rspack rely on the textual
  // rewrite for everything.
  const isCssLikeOnly = meta.framework === 'vite'
NuxtLogger.debug(`LayerAliasingPlugin(options=${options}): isCssLikeOnly → ${isCssLikeOnly}`);
  const transformInclude: UnpluginOptions['transformInclude'] = (id) => {
	NuxtLogger.debug(`>>> Entering transformInclude(id=${id})`);
    const _id = normalize(id)
    if (!layers.some(dir => _id.startsWith(dir))) { return false }
	NuxtLogger.debug(`transformInclude(id=${id}): _id → ${_id}`);
    if (isCssLikeOnly && !CSS_LANG_RE.test(id)) { return false }
	NuxtLogger.debug(`<<< Exiting transformInclude(id=${id})`);
NuxtLogger.debug(`<<< Exiting LayerAliasingPlugin(options=${options})`);
    return true
  }
  const transform: UnpluginOptions['transform'] = {
    filter: {
      code: { include: ALIAS_RE_SINGLE },
    },
    handler (code, id, meta?: unknown) {
	NuxtLogger.debug(`>>> Entering handler(code=${code},id=${id},meta=${meta})`);
      const _id = normalize(id)
      const layer = layers.find(l => _id.startsWith(l))
      if (!layer) { return }
	NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): _id → ${_id}`);

      const s = rolldownString(code, id, meta)
      for (const match of code.matchAll(ALIAS_RE)) {
	NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`);
        const replacement = aliases[layer]?.[match[0] as '~']
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): replacement → ${replacement}`);
        if (replacement && replacement !== match[0]) {
          s.overwrite(match.index, match.index + match[0].length, replacement)
        }
      }

	NuxtLogger.debug(`<<< Exiting handler(code=${code},id=${id},meta=${meta})`);
      return generateTransform(s, id)
    },
  }

  return {
    name: 'nuxt:layer-aliasing',
    enforce: 'pre',
    vite: {
      resolveId: {
        order: 'pre',
        filter: {
          id: ALIAS_ID_RE,
        },
        handler (id, importer) {
		NuxtLogger.debug(`>>> Entering handler(id=${id},importer=${importer})`);
          if (!importer) { return }

          const layer = layers.find(l => importer.startsWith(l))
          if (!layer) { return }
		NuxtLogger.debug(`handler(code=${code},id=${id},meta=${meta}): layer → ${layer}`);
		NuxtLogger.debug(`handler(id=${id},importer=${importer}): layer → ${layer}`);

          const resolvedId = resolveAlias(id, aliases[layer])
          if (resolvedId !== id) {
		NuxtLogger.debug(`handler(id=${id},importer=${importer}): resolvedId → ${resolvedId}`);
			NuxtLogger.debug(`<<< Exiting handler(id=${id},importer=${importer})`);
            return this.resolve(resolvedId, importer, { skipSelf: true })
          }
        },
      },
    },

    // https://github.com/nuxt/nuxt/issues/24427
    transformInclude,
    transform,
  }
})
