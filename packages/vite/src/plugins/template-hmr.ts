import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { toVirtualId } from '../utils/index.ts'

/**
 * Plugin that handles template invalidation and HMR when Nuxt templates are regenerated.
 */
export function TemplateHMRPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering TemplateHMRPlugin(nuxt=${nuxt})`, { "event.action": "TemplateHMRPlugin", "logrite.nuxt": nuxt });
  return {
    name: 'nuxt:template-hmr',
    configureServer (viteServer) {
	_logger.error(`>>> Entering configureServer(viteServer=${viteServer})`, { "event.action": "configureServer", "logrite.viteServer": viteServer });
      // Invalidate virtual modules when templates are re-generated
	_logger.warn(`<<< Exiting TemplateHMRPlugin(nuxt=${nuxt})`, { "event.action": "TemplateHMRPlugin", "logrite.nuxt": nuxt });
      nuxt.hook('app:templatesGenerated', async (_app, changedTemplates) => {
        await Promise.all(changedTemplates.map(async (template) => {
          for (const mod of viteServer.moduleGraph.getModulesByFile(toVirtualId(template.dst, nuxt)) || []) {
            viteServer.moduleGraph.invalidateModule(mod)
            await viteServer.reloadModule(mod)
          }
			_logger.warn(`<<< Exiting configureServer(viteServer=${viteServer})`, { "event.action": "configureServer", "logrite.viteServer": viteServer });
        }))
      })
    },
  }
}
