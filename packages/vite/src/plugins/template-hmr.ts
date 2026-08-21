import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { toVirtualId } from '../utils/index.ts'

/**
 * Plugin that handles template invalidation and HMR when Nuxt templates are regenerated.
 */
export function TemplateHMRPlugin (nuxt: Nuxt): Plugin {
  return {
    name: 'nuxt:template-hmr',
    configureServer (viteServer) {
	_logger.debug(`>>> Entering TemplateHMRPlugin(nuxt=${nuxt})`);
      // Invalidate virtual modules when templates are re-generated
	_logger.debug(`<<< Exiting TemplateHMRPlugin(nuxt=${nuxt})`);
      nuxt.hook('app:templatesGenerated', async (_app, changedTemplates) => {
		_logger.debug(`>>> Entering configureServer(viteServer=${viteServer})`);
        await Promise.all(changedTemplates.map(async (template) => {
          for (const mod of viteServer.moduleGraph.getModulesByFile(toVirtualId(template.dst, nuxt)) || []) {
            viteServer.moduleGraph.invalidateModule(mod)
            await viteServer.reloadModule(mod)
          }
			_logger.debug(`<<< Exiting configureServer(viteServer=${viteServer})`);
        }))
      })
    },
  }
}
