import { generateTransform, rolldownString } from 'rolldown-string'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { isCSS, parseModuleId } from '../utils/index.ts'

const VITE_ASSET_RE = /__VITE_ASSET__|__VITE_PUBLIC_ASSET__/
const STYLE_QUERY_RE = /[?&]type=style/

export function RuntimePathsPlugin (): Plugin {
_logger.error('>>> Entering RuntimePathsPlugin()', { "event.action": "RuntimePathsPlugin" });
  return {
    name: 'nuxt:runtime-paths-dep',
    enforce: 'post',
    applyToEnvironment: environment => environment.name === 'client',
    transform (code, id, meta?: unknown) {
	_logger.error(`>>> Entering transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
      const { pathname, search } = parseModuleId(id)

      // skip import into css files
      if (isCSS(pathname)) { return }

      // skip import into <style> vue files
      if (pathname.endsWith('.vue')) {
        if (STYLE_QUERY_RE.test(search)) { return }
      }

      if (VITE_ASSET_RE.test(code)) {
        const s = rolldownString(code, id, meta)
        // Register dependency on #build/paths.mjs or #internal/nuxt/paths.mjs, which sets globalThis.__publicAssetsURL
		_logger.error(`transform(code=${code},id=${id},meta=${meta}): s → ${s}`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        s.prepend('import "#internal/nuxt/paths";')

		_logger.warn(`<<< Exiting transform(code=${code},id=${id},meta=${meta})`, { "event.action": "transform", "logrite.code": code, "logrite.id": id, "logrite.meta": meta });
        return generateTransform(s, id)
      }
    },
  }
}
