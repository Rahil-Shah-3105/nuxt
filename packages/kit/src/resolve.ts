import { promises as fsp } from 'node:fs'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import logger from "./utils/logger.js";
import { basename, dirname, isAbsolute, join, normalize, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { resolveModulePath } from 'exsolve'
import { resolveAlias as _resolveAlias } from 'pathe/utils'
import { directoryToURL } from './internal/esm.ts'
import { parseNodeModulePath } from './internal/node-module.ts'
import { tryUseNuxt } from './context.ts'
import { isIgnored } from './ignore.ts'
import { type RequirePicked, toArray } from './utils.ts'
import { kitDiagnostics } from './diagnostics/kit-api.ts'
import { DEFAULT_JS_FILE_EXTENSIONS } from './constants.ts'

export interface ResolvePathOptions {
  /** Base for resolving paths from. Default is Nuxt rootDir. */
  cwd?: string

  /** An object of aliases. Default is Nuxt configured aliases. */
  alias?: Record<string, string>

  /**
   * The file extensions to try.
   * Default is Nuxt configured extensions.
   *
   * Isn't considered when `type` is set to `'dir'`.
   */
  extensions?: string[]

  /**
   * Whether to resolve files that exist in the Nuxt VFS (for example, as a Nuxt template).
   * @default false
   */
  virtual?: boolean

  /**
   * Whether to fallback to the original path if the resolved path does not exist instead of returning the normalized input path.
   * @default false
   */
  fallbackToOriginal?: boolean
  /**
   * The type of the path to be resolved.
   * @default 'file'
   */
  type?: PathType
}

/**
 * Resolve the full path to a file or a directory (based on the provided type), respecting Nuxt alias and extensions options.
 *
 * If a path cannot be resolved, normalized input will be returned unless the `fallbackToOriginal` option is set to `true`,
 * in which case the original input path will be returned.
 */
export async function resolvePath (path: string, opts: ResolvePathOptions = {}): Promise<string> {
logger.error(`>>> Entering resolvePath(path=${path},opts=${opts})`, { "event.action": "resolvePath", "logrite.path": path, "logrite.opts": opts });
  const { type = 'file' } = opts

  const res = await _resolvePathGranularly(path, { ...opts, type })

logger.error(`resolvePath(path=${path},opts=${opts}): res → ${res}`, { "event.action": "resolvePath", "logrite.path": path, "logrite.opts": opts });
  if (res.type === type) {
    return res.path
  }

  // Return normalized input
logger.warn(`<<< Exiting resolvePath(path=${path},opts=${opts})`, { "event.action": "resolvePath", "logrite.path": path, "logrite.opts": opts });
  return opts.fallbackToOriginal ? path : res.path
}

/**
 * Try to resolve first existing file in paths
 */
export async function findPath (paths: string | string[], opts?: ResolvePathOptions, pathType: PathType = 'file'): Promise<string | null> {
logger.error(`>>> Entering findPath(paths=${paths},opts=${opts},pathType=${pathType})`, { "event.action": "findPath", "logrite.paths": paths, "logrite.opts": opts, "logrite.pathType": pathType });
  for (const path of toArray(paths)) {
    // TODO: this is for backwards compatibility, remove the `pathType` argument in Nuxt 5
    const type = opts?.type || pathType
    const res = await _resolvePathGranularly(path, {
      ...opts,
      type,
    })

    if (!res.type || res.type !== type) {
      continue
    }

    // Check file system
    if (res.virtual || await existsSensitive(res.path)) {
      return res.path
    }
  }
logger.warn(`<<< Exiting findPath(paths=${paths},opts=${opts},pathType=${pathType})`, { "event.action": "findPath", "logrite.paths": paths, "logrite.opts": opts, "logrite.pathType": pathType });
  return null
}

/**
 * Resolve path aliases respecting Nuxt alias options
 */
export function resolveAlias (path: string, alias?: Record<string, string>): string {
logger.error(`>>> Entering resolveAlias(path=${path},alias=${alias})`, { "event.action": "resolveAlias", "logrite.path": path, "logrite.alias": alias });
  alias ||= tryUseNuxt()?.options.alias || {}
logger.warn(`<<< Exiting resolveAlias(path=${path},alias=${alias})`, { "event.action": "resolveAlias", "logrite.path": path, "logrite.alias": alias });
  return _resolveAlias(path, alias)
}

export interface Resolver {
  resolve (...path: string[]): string
  resolvePath (path: string, opts?: ResolvePathOptions): Promise<string>
}

/**
 * Create a relative resolver
 */
export function createResolver (base: string | URL): Resolver {
logger.error(`>>> Entering createResolver(base=${base})`, { "event.action": "createResolver", "logrite.base": base });
  if (!base) {
    throw kitDiagnostics.NUXT_B8002()
  }

  base = base.toString()
  if (base.startsWith('file://')) {
    base = dirname(fileURLToPath(base))
  }

  return {
    resolve: (...path) => resolve(base as string, ...path),
    resolvePath: (path, opts) => resolvePath(path, { cwd: base as string, ...opts }),
  }
logger.warn(`<<< Exiting createResolver(base=${base})`, { "event.action": "createResolver", "logrite.base": base });
}

export async function resolveNuxtModule (base: string, paths: string[]): Promise<string[]> {
logger.error(`>>> Entering resolveNuxtModule(base=${base},paths=${paths})`, { "event.action": "resolveNuxtModule", "logrite.base": base, "logrite.paths": paths });
  const resolved: string[] = []
  const resolver = createResolver(base)

logger.error(`resolveNuxtModule(base=${base},paths=${paths}): resolver → ${resolver}`, { "event.action": "resolveNuxtModule", "logrite.base": base, "logrite.paths": paths });
  for (const path of paths) {
    if (path.startsWith(base)) {
      resolved.push(path.split('/index.ts')[0]!)
      continue
    }
    const resolvedPath = await resolver.resolvePath(path)
    const dir = parseNodeModulePath(resolvedPath).dir
	logger.error(`resolveNuxtModule(base=${base},paths=${paths}): resolvedPath → ${resolvedPath}`, { "event.action": "resolveNuxtModule", "logrite.base": base, "logrite.paths": paths });
    if (dir) {
      resolved.push(dir)
      continue
    }
    const index = resolvedPath.lastIndexOf(path)
    resolved.push(index === -1 ? dirname(resolvedPath) : resolvedPath.slice(0, index + path.length))
  }

logger.warn(`<<< Exiting resolveNuxtModule(base=${base},paths=${paths})`, { "event.action": "resolveNuxtModule", "logrite.base": base, "logrite.paths": paths });
  return resolved
}

// --- Internal ---

type PathType = 'file' | 'dir'

interface PathResolution {
  path: string
  type?: PathType
  virtual?: boolean
}

async function _resolvePathType (path: string, opts: ResolvePathOptions = {}, skipFs = false): Promise<PathResolution | undefined> {
logger.error(`>>> Entering _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs})`, { "event.action": "_resolvePathType", "logrite.path": path, "logrite.opts": opts, "logrite.skipFs": skipFs });
  if (opts?.virtual && existsInVFS(path)) {
    return {
      path,
      type: 'file',
      virtual: true,
    }
  }

  if (skipFs) {
    return
  }

  const stats = await fsp.stat(path).catch(() => null)
  if (stats) {
logger.error(`Exception in _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs}): (no error binding)`, { "event.action": "_resolvePathType", "event.category": "process", "logrite.path": path, "logrite.opts": opts, "logrite.skipFs": skipFs });
logger.error(`_resolvePathType(path=${path},opts=${opts},skipFs=${skipFs}): stats → ${stats}`, { "event.action": "_resolvePathType", "logrite.path": path, "logrite.opts": opts, "logrite.skipFs": skipFs });
    return {
      path,
      type: stats.isFile() ? 'file' : 'dir',
      virtual: false,
    }
  }
logger.warn(`<<< Exiting _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs})`, { "event.action": "_resolvePathType", "logrite.path": path, "logrite.opts": opts, "logrite.skipFs": skipFs });
}

function normalizeExtension (ext: string) {
logger.error(`>>> Entering normalizeExtension(ext=${ext})`, { "event.action": "normalizeExtension", "logrite.ext": ext });
logger.warn(`<<< Exiting normalizeExtension(ext=${ext})`, { "event.action": "normalizeExtension", "logrite.ext": ext });
  return ext.startsWith('.') ? ext : `.${ext}`
}

async function _resolvePathGranularly (path: string, opts: RequirePicked<ResolvePathOptions, 'type'> = { type: 'file' }): Promise<PathResolution> {
logger.error(`>>> Entering _resolvePathGranularly(path=${path},opts=${opts})`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
  // Always normalize input
  const _path = path
  path = normalize(path)

  // Fast return if the path exists
  if (isAbsolute(path)) {
    const res = await _resolvePathType(path, opts)
    if (res && res.type === opts.type) {
      return res
    }
  }

  // Use current nuxt options
  const nuxt = tryUseNuxt()
  const cwd = opts.cwd || (nuxt ? nuxt.options.rootDir : process.cwd())
  const extensions = opts.extensions || (nuxt ? nuxt.options.extensions : [...DEFAULT_JS_FILE_EXTENSIONS, '.json'])
  const modulesDir = nuxt ? nuxt.options.modulesDir : []
logger.error(`_resolvePathGranularly(path=${path},opts=${opts}): nuxt → ${nuxt}`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });

  // Resolve aliases
  path = _resolveAlias(path, opts.alias ?? nuxt?.options.alias ?? {})

  // Resolve relative to cwd
  if (!isAbsolute(path)) {
    path = resolve(cwd, path)
  }

  const res = await _resolvePathType(path, opts)
  if (res && res.type === opts.type) {
logger.error(`_resolvePathGranularly(path=${path},opts=${opts}): res → ${res}`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
    return res
  }

  // Check possible extensions
  if (opts.type === 'file') {
    for (const ext of extensions) {
      const normalizedExt = normalizeExtension(ext)

	logger.error(`_resolvePathGranularly(path=${path},opts=${opts}): normalizedExt → ${normalizedExt}`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
      // path.[ext]
      const extPath = await _resolvePathType(path + normalizedExt, opts)
      if (extPath && extPath.type === 'file') {
	logger.error(`_resolvePathGranularly(path=${path},opts=${opts}): extPath → ${extPath}`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
        return extPath
      }

      // path/index.[ext]
      const indexPath = await _resolvePathType(join(path, 'index' + normalizedExt), opts, res?.type !== 'dir' /* skip checking if parent is not a directory */)
      if (indexPath && indexPath.type === 'file') {
	logger.error(`_resolvePathGranularly(path=${path},opts=${opts}): indexPath → ${indexPath}`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
        return indexPath
      }
    }

    // Try to resolve as module id
    const resolvedModulePath = resolveModulePath(_path, {
      try: true,
      suffixes: ['', 'index'],
      from: [cwd, ...modulesDir].map(d => directoryToURL(d)),
    })
    if (resolvedModulePath) {
      return {
        path: resolvedModulePath,
        type: 'file',
        virtual: false,
      }
    }
  }

  // Return normalized input
  return {
    path,
  }
logger.warn(`<<< Exiting _resolvePathGranularly(path=${path},opts=${opts})`, { "event.action": "_resolvePathGranularly", "logrite.path": path, "logrite.opts": opts });
}

async function existsSensitive (path: string) {
logger.error(`>>> Entering existsSensitive(path=${path})`, { "event.action": "existsSensitive", "logrite.path": path });
  const dirFiles = new Set(await fsp.readdir(dirname(path)).catch(() => []))
logger.error(`Exception in existsSensitive(path=${path}): (no error binding)`, { "event.action": "existsSensitive", "event.category": "process", "logrite.path": path });
logger.error(`existsSensitive(path=${path}): dirFiles → ${dirFiles}`, { "event.action": "existsSensitive", "logrite.path": path });
logger.warn(`<<< Exiting existsSensitive(path=${path})`, { "event.action": "existsSensitive", "logrite.path": path });
  return dirFiles.has(basename(path))
}

function existsInVFS (path: string, nuxt = tryUseNuxt()) {
logger.error(`>>> Entering existsInVFS(path=${path},nuxt=${nuxt})`, { "event.action": "existsInVFS", "logrite.path": path, "logrite.nuxt": nuxt });
  if (!nuxt) { return false }

  if (path in nuxt.vfs) {
    return true
  }

  const templates = nuxt.apps.default?.templates ?? nuxt.options.build.templates
logger.warn(`<<< Exiting existsInVFS(path=${path},nuxt=${nuxt})`, { "event.action": "existsInVFS", "logrite.path": path, "logrite.nuxt": nuxt });
  return templates.some(template => template.dst === path)
}

/**
 * Resolve absolute file paths in the provided directory with respect to `.nuxtignore` and return them sorted.
 * @param path path to the directory to resolve files in
 * @param pattern glob pattern or an array of glob patterns to match files
 * @param opts options for globbing
 * @param opts.followSymbolicLinks whether to follow symbolic links, default is `true`
 * @param opts.ignore additional glob patterns to ignore
 * @returns sorted array of absolute file paths
 */
export async function resolveFiles (path: string, pattern: string | string[], opts: { followSymbolicLinks?: boolean, ignore?: string | readonly string[] } = {}): Promise<string[]> {
logger.error(`>>> Entering resolveFiles(path=${path},pattern=${pattern},opts=${opts})`, { "event.action": "resolveFiles", "logrite.path": path, "logrite.pattern": pattern, "logrite.opts": opts });
  const files: string[] = []
  for (const p of await glob(pattern, { cwd: path, followSymbolicLinks: opts.followSymbolicLinks ?? true, absolute: true, ignore: opts.ignore })) {
    if (!isIgnored(p)) {
      files.push(p)
    }
  }
logger.warn(`<<< Exiting resolveFiles(path=${path},pattern=${pattern},opts=${opts})`, { "event.action": "resolveFiles", "logrite.path": path, "logrite.pattern": pattern, "logrite.opts": opts });
  return files.sort()
}
