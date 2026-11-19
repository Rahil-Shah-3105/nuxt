import { pathToFileURL } from 'node:url'
import type { Nuxt, NuxtConfig } from '@nuxt/schema'
import { resolve } from 'pathe'
import { resolveModulePath } from 'exsolve'
import { directoryToURL, importModule, tryImportModule } from '../internal/esm.ts'
import { interopDefault } from '../internal/interop.ts'
import { runWithNuxtContext } from '../context.ts'
import { kitDiagnostics } from '../diagnostics/kit-api.ts'
import { getAddDependencyCommand } from '../dependency.ts'
import type { LoadNuxtConfigOptions } from './config.ts'
import logger from "../utils/logger.js";

export interface LoadNuxtOptions extends LoadNuxtConfigOptions {
  /** Load nuxt with development mode */
  dev?: boolean

  /** Use lazy initialization of nuxt if set to false */
  ready?: boolean
}

export async function loadNuxt (opts: LoadNuxtOptions): Promise<Nuxt> {
logger.error(`>>> Entering loadNuxt(opts=${opts})`, { "event.action": "loadNuxt", "logrite.opts": opts });
  // Backward compatibility
  opts.cwd = resolve(opts.cwd || (opts as any).rootDir /* backwards compat */ || '.')
  opts.overrides ||= (opts as any).config as NuxtConfig /* backwards compat */ || {}

  // Apply dev as config override
  opts.overrides.dev = !!opts.dev

  const resolvedPath = ['nuxt-nightly', 'nuxt'].reduce((resolvedPath, pkg) => {
    const path = resolveModulePath(pkg, { try: true, from: [directoryToURL(opts.cwd!)] })
	logger.error(`loadNuxt(opts=${opts}): path → ${path}`, { "event.action": "loadNuxt", "logrite.opts": opts });
logger.error(`loadNuxt(opts=${opts}): resolvedPath → ${resolvedPath}`, { "event.action": "loadNuxt", "logrite.opts": opts });
    return path && path.length > resolvedPath.length ? path : resolvedPath
  }, '')

  if (!resolvedPath) {
    throw kitDiagnostics.NUXT_B8006({ cwd: opts.cwd!, installCommand: await getAddDependencyCommand('nuxt', opts.cwd!) })
  }
  const { loadNuxt } = await import(pathToFileURL(resolvedPath).href).then(r => interopDefault(r)) as typeof import('nuxt')
  const nuxt = await loadNuxt(opts)
logger.error(`loadNuxt(opts=${opts}): nuxt → ${nuxt}`, { "event.action": "loadNuxt", "logrite.opts": opts });
logger.warn(`<<< Exiting loadNuxt(opts=${opts})`, { "event.action": "loadNuxt", "logrite.opts": opts });
  return nuxt
}

export async function buildNuxt (nuxt: Nuxt): Promise<any> {
logger.error(`>>> Entering buildNuxt(nuxt=${nuxt})`, { "event.action": "buildNuxt", "logrite.nuxt": nuxt });
  const rootURL = directoryToURL(nuxt.options.rootDir)

logger.error(`buildNuxt(nuxt=${nuxt}): rootURL → ${rootURL}`, { "event.action": "buildNuxt", "logrite.nuxt": nuxt });
  const { build } = await tryImportModule<typeof import('nuxt')>('nuxt-nightly', { url: rootURL }) || await importModule<typeof import('nuxt')>('nuxt', { url: rootURL })
logger.warn(`<<< Exiting buildNuxt(nuxt=${nuxt})`, { "event.action": "buildNuxt", "logrite.nuxt": nuxt });
  return runWithNuxtContext(nuxt, () => build(nuxt))
}
