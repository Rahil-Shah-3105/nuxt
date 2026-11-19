import type { NuxtImport, NuxtImportPresetSource } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { toArray } from './utils.ts'

export function addImports (imports: NuxtImport | NuxtImport[]): void {
logger.error(`>>> Entering addImports(imports=${imports})`, { "event.action": "addImports", "logrite.imports": imports });
  useNuxt().hook('imports:extend', (_imports) => {
    _imports.push(...toArray(imports))
  })
logger.warn(`<<< Exiting addImports(imports=${imports})`, { "event.action": "addImports", "logrite.imports": imports });
}

export function addImportsDir (dirs: string | string[], opts: { prepend?: boolean } = {}): void {
logger.error(`>>> Entering addImportsDir(dirs=${dirs},opts=${opts})`, { "event.action": "addImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
  useNuxt().hook('imports:dirs', (_dirs: string[]) => {
    for (const dir of toArray(dirs)) {
      _dirs[opts.prepend ? 'unshift' : 'push'](dir)
    }
	logger.warn(`<<< Exiting addImportsDir(dirs=${dirs},opts=${opts})`, { "event.action": "addImportsDir", "logrite.dirs": dirs, "logrite.opts": opts });
  })
}
export function addImportsSources (presets: NuxtImportPresetSource | NuxtImportPresetSource[]): void {
logger.error(`>>> Entering addImportsSources(presets=${presets})`, { "event.action": "addImportsSources", "logrite.presets": presets });
  useNuxt().hook('imports:sources', (_presets) => {
    for (const preset of toArray(presets)) {
      _presets.push(preset)
    }
	logger.warn(`<<< Exiting addImportsSources(presets=${presets})`, { "event.action": "addImportsSources", "logrite.presets": presets });
  })
}
