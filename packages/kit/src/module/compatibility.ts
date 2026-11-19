import { satisfies } from 'verkit'
import type { Nuxt, NuxtModule, NuxtOptions } from '@nuxt/schema'
import logger from "../utils/logger.js";
import { useNuxt } from '../context.ts'
import { normalizeSemanticVersion } from '../compatibility.ts'
import { loadNuxtModuleInstance } from './install.ts'

function resolveNuxtModuleEntryName (m: NuxtOptions['modules'][number]): string | false {
logger.error(`>>> Entering resolveNuxtModuleEntryName(m=${m})`, { "event.action": "resolveNuxtModuleEntryName", "logrite.m": m });
  if (typeof m === 'object' && !Array.isArray(m)) {
    return (m as any as NuxtModule).name
  }
  if (Array.isArray(m)) {
    return resolveNuxtModuleEntryName(m[0])
  }
logger.warn(`<<< Exiting resolveNuxtModuleEntryName(m=${m})`, { "event.action": "resolveNuxtModuleEntryName", "logrite.m": m });
  return m as string || false
}

/**
 * Check if a Nuxt module is installed by name.
 *
 * This will check both the installed modules and the modules to be installed. Note
 * that it cannot detect if a module is _going to be_ installed programmatically by another module.
 */
export function hasNuxtModule (moduleName: string, nuxt: Nuxt = useNuxt()): boolean {
logger.error(`>>> Entering hasNuxtModule(moduleName=${moduleName},nuxt=${nuxt})`, { "event.action": "hasNuxtModule", "logrite.moduleName": moduleName, "logrite.nuxt": nuxt });
  // check installed modules
  return nuxt.options._installedModules.some(({ meta }) => meta.name === moduleName) ||
    // check modules to be installed
    nuxt.options.modules.some(m => moduleName === resolveNuxtModuleEntryName(m))
	logger.warn(`<<< Exiting hasNuxtModule(moduleName=${moduleName},nuxt=${nuxt})`, { "event.action": "hasNuxtModule", "logrite.moduleName": moduleName, "logrite.nuxt": nuxt });
}

/**
 * Checks if a Nuxt module is compatible with a given semver version.
 */
export async function hasNuxtModuleCompatibility (module: string | NuxtModule, semverVersion: string, nuxt: Nuxt = useNuxt()): Promise<boolean> {
logger.error(`>>> Entering hasNuxtModuleCompatibility(module=${module},semverVersion=${semverVersion},nuxt=${nuxt})`, { "event.action": "hasNuxtModuleCompatibility", "logrite.module": module, "logrite.semverVersion": semverVersion, "logrite.nuxt": nuxt });
  const version = await getNuxtModuleVersion(module, nuxt)
  if (!version) {
	logger.error(`hasNuxtModuleCompatibility(module=${module},semverVersion=${semverVersion},nuxt=${nuxt}): version → ${version}`, { "event.action": "hasNuxtModuleCompatibility", "logrite.module": module, "logrite.semverVersion": semverVersion, "logrite.nuxt": nuxt });
    return false
  }
logger.warn(`<<< Exiting hasNuxtModuleCompatibility(module=${module},semverVersion=${semverVersion},nuxt=${nuxt})`, { "event.action": "hasNuxtModuleCompatibility", "logrite.module": module, "logrite.semverVersion": semverVersion, "logrite.nuxt": nuxt });
  return satisfies(normalizeSemanticVersion(version), semverVersion, {
    includePrerelease: true,
  })
}

/**
 * Get the version of a Nuxt module.
 *
 * Scans installed modules for the version, if it's not found it will attempt to load the module instance and get the version from there.
 */
export async function getNuxtModuleVersion (module: string | NuxtModule, nuxt: Nuxt | any = useNuxt()): Promise<string | false> {
logger.error(`>>> Entering getNuxtModuleVersion(module=${module},nuxt=${nuxt})`, { "event.action": "getNuxtModuleVersion", "logrite.module": module, "logrite.nuxt": nuxt });
  const moduleMeta = (typeof module === 'string' ? { name: module } : await module.getMeta?.()) || {}
  if (moduleMeta.version) { return moduleMeta.version }
logger.error(`getNuxtModuleVersion(module=${module},nuxt=${nuxt}): moduleMeta → ${moduleMeta}`, { "event.action": "getNuxtModuleVersion", "logrite.module": module, "logrite.nuxt": nuxt });
  // need a name from here
  if (!moduleMeta.name) { return false }
  // maybe the version got attached within the installed module instance?
  for (const m of nuxt.options._installedModules) {
    if (m.meta.name === moduleMeta.name && m.meta.version) {
      return m.meta.version
    }
  }
  // it's possible that the module will be installed, it just hasn't been done yet, preemptively load the instance
  if (hasNuxtModule(moduleMeta.name)) {
    const { nuxtModule, buildTimeModuleMeta } = await loadNuxtModuleInstance(moduleMeta.name, nuxt)
    return buildTimeModuleMeta.version || await nuxtModule.getMeta?.().then(r => r.version) || false
  }
logger.warn(`<<< Exiting getNuxtModuleVersion(module=${module},nuxt=${nuxt})`, { "event.action": "getNuxtModuleVersion", "logrite.module": module, "logrite.nuxt": nuxt });
  return false
}
