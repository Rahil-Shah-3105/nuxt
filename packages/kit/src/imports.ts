import type { NuxtImport, NuxtImportPresetSource } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { toArray } from './utils.ts'

export function addImports (imports: NuxtImport | NuxtImport[]): void {
  useNuxt().hook('imports:extend', (_imports) => {
	logger.debug(`>>> Entering addImports(imports=${imports})`);
	logger.debug(`<<< Exiting addImports(imports=${imports})`);
    _imports.push(...toArray(imports))
  })
}

export function addImportsDir (dirs: string | string[], opts: { prepend?: boolean } = {}): void {
  useNuxt().hook('imports:dirs', (_dirs: string[]) => {
	logger.debug(`>>> Entering addImportsDir(dirs=${dirs},opts=${opts})`);
    for (const dir of toArray(dirs)) {
      _dirs[opts.prepend ? 'unshift' : 'push'](dir)
    }
	logger.debug(`<<< Exiting addImportsDir(dirs=${dirs},opts=${opts})`);
  })
}
export function addImportsSources (presets: NuxtImportPresetSource | NuxtImportPresetSource[]): void {
  useNuxt().hook('imports:sources', (_presets) => {
	logger.debug(`>>> Entering addImportsSources(presets=${presets})`);
    for (const preset of toArray(presets)) {
      _presets.push(preset)
    }
	logger.debug(`<<< Exiting addImportsSources(presets=${presets})`);
  })
}
