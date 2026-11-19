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
NuxtLogger.error(`>>> Entering LayerAliasingPlugin(options=${options})`, { "event.action": "LayerAliasingPlugin", "logrite.options": options });
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

NuxtLogger.error(`LayerAliasingPlugin(options=${options}): layers → ${layers}`, { "event.action": "LayerAliasingPlugin", "logrite.options": options });
  // On vite, JS imports are handled by the `resolveId` hook below; the
  // textual rewrite is only needed for CSS files, whose `@import` / `url()`
  // resolution skips plugin `resolveId`. Webpack/rspack rely on the textual
  // rewrite for everything.
  const isCssLikeOnly = meta.framework === 'vite'
NuxtLogger.error(`LayerAliasingPlugin(options=${options}): isCssLikeOnly → ${isCssLikeOnly}`, { "event.action": "LayerAliasingPlugin", "logrite.options": options });
  const transformInclude: UnpluginOptions['transformInclude'] = (id) => {
	NuxtLogger.error(`>>> Entering transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
    const _id = normalize(id)
    if (!layers.some(dir => _id.startsWith(dir))) { return false }
	NuxtLogger.error(`transformInclude(id=${id}): _id → ${_id}`, { "event.action": "transformInclude", "logrite.id": id });
    if (isCssLikeOnly && !CSS_LANG_RE.test(id)) { return false }
	NuxtLogger.warn(`<<< Exiting transformInclude(id=${id})`, { "event.action": "transformInclude", "logrite.id": id });
    return true
  }
  const transform: UnpluginOptions['transform'] = {
    filter: {
      code: { include: ALIAS_RE_SINGLE },
    },
    handler (code, id, meta?: unknown) {
	NuxtLogger.error(`>>> Entering handler(code=${code},id=${id},meta=${meta})`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      const _id = normalize(id)
      const layer = layers.find(l => _id.startsWith(l))
      if (!layer) { return }
	NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): _id → ${_id}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
	NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): layer → ${layer}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });

      const s = rolldownString(code, id, meta)
      for (const match of code.matchAll(ALIAS_RE)) {
        const replacement = aliases[layer]?.[match[0] as '~']
        if (replacement && replacement !== match[0]) {
          s.overwrite(match.index, match.index + match[0].length, replacement)
        }
      }

	NuxtLogger.error(`handler(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "handler", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
	NuxtLogger.warn(`<<< Exiting handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
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
		NuxtLogger.error(`>>> Entering handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
          if (!importer) { return }

          const layer = layers.find(l => importer.startsWith(l))
          if (!layer) { return }
		NuxtLogger.error(`handler(id=${id},importer=${importer}): layer → ${layer}`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });

          const resolvedId = resolveAlias(id, aliases[layer])
          if (resolvedId !== id) {
		NuxtLogger.error(`handler(id=${id},importer=${importer}): resolvedId → ${resolvedId}`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
            return this.resolve(resolvedId, importer, { skipSelf: true })
          }
			NuxtLogger.warn(`<<< Exiting handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
        },
      },
    },

    // https://github.com/nuxt/nuxt/issues/24427
    transformInclude,
    transform,
  }
})
