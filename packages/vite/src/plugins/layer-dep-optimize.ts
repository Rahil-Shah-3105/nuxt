import type { Plugin } from 'vite'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { join, normalize } from 'pathe'
import { getLayerDirectories } from '@nuxt/kit'

export function LayerDepOptimizePlugin (nuxt: Nuxt): Plugin | undefined {
  if (!nuxt.options.dev) {
	_logger.debug(`>>> Entering LayerDepOptimizePlugin(nuxt=${nuxt})`);
    return
  }

  // TODO: this may no longer be needed with most recent vite version
  // Identify which layers will need to have an extra resolve step.
  const layerDirs: string[] = []
  const delimitedRootDir = nuxt.options.rootDir + '/'
  for (const dirs of getLayerDirectories(nuxt)) {
	_logger.debug(`LayerDepOptimizePlugin(nuxt=${nuxt}): delimitedRootDir → ${delimitedRootDir}`);
    if (dirs.app !== nuxt.options.srcDir && !dirs.app.startsWith(delimitedRootDir)) {
      layerDirs.push(dirs.app)
    }
  }

  if (layerDirs.length > 0) {
    // Reverse so longest/most specific directories are searched first
    const dirs = layerDirs.toSorted().reverse()
    return {
      name: 'nuxt:optimize-layer-deps',
      enforce: 'pre',
      resolveId: {
        async handler (source, _importer) {
		_logger.debug(`>>> Entering handler(source=${source},_importer=${_importer})`);
          if (!_importer) { return }
          const importer = normalize(_importer)
          const layerIndex = dirs.findIndex(dir => importer.startsWith(dir))
          // Trigger vite to optimize dependencies imported within a layer, just as if they were imported in final project
		_logger.debug(`handler(source=${source},_importer=${_importer}): importer → ${importer}`);
          if (layerIndex !== -1) {
			_logger.debug(`handler(source=${source},_importer=${_importer}): layerIndex → ${layerIndex}`);
            dirs.splice(layerIndex, 1)
            await this.resolve(source, join(nuxt.options.srcDir, 'index.html'), { skipSelf: true }).catch(() => null)
          }
			_logger.debug(`<<< Exiting handler(source=${source},_importer=${_importer})`);
        },
      },
    }
  }
}
