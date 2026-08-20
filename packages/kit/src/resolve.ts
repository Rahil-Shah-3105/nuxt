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
  const { type = 'file' } = opts

  const res = await _resolvePathGranularly(path, { ...opts, type })

logger.debug(`resolvePath(path=${path},opts=${opts}): res → ${res}`);
  if (res.type === type) {
	logger.debug(`>>> Entering resolvePath(path=${path},opts=${opts})`);
	logger.debug(`<<< Exiting resolvePath(path=${path},opts=${opts})`);
    return res.path
  }

  // Return normalized input
  return opts.fallbackToOriginal ? path : res.path
}

/**
 * Try to resolve first existing file in paths
 */
export async function findPath (paths: string | string[], opts?: ResolvePathOptions, pathType: PathType = 'file'): Promise<string | null> {
  for (const path of toArray(paths)) {
	logger.debug(`>>> Entering findPath(paths=${paths},opts=${opts},pathType=${pathType})`);
    // TODO: this is for backwards compatibility, remove the `pathType` argument in Nuxt 5
    const type = opts?.type || pathType
    const res = await _resolvePathGranularly(path, {
      ...opts,
      type,
    })

    if (!res.type || res.type !== type) {
      continue
	logger.debug(`>>> Entering _resolvePathGranularly(path=${path},opts=${opts})`);
    }

    // Check file system
    if (res.virtual || await existsSensitive(res.path)) {
	logger.debug(`>>> Entering existsSensitive(path=${path})`);
	logger.debug(`<<< Exiting existsSensitive(path=${path})`);
	logger.debug(`<<< Exiting _resolvePathGranularly(path=${path},opts=${opts})`);
	logger.debug(`<<< Exiting findPath(paths=${paths},opts=${opts},pathType=${pathType})`);
      return res.path
    }
  }
  return null
}

/**
 * Resolve path aliases respecting Nuxt alias options
 */
export function resolveAlias (path: string, alias?: Record<string, string>): string {
logger.debug(`>>> Entering resolveAlias(path=${path},alias=${alias})`);
  alias ||= tryUseNuxt()?.options.alias || {}
logger.debug(`<<< Exiting resolveAlias(path=${path},alias=${alias})`);
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
  if (!base) {
	logger.debug(`>>> Entering createResolver(base=${base})`);
	logger.debug(`<<< Exiting createResolver(base=${base})`);
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
}

export async function resolveNuxtModule (base: string, paths: string[]): Promise<string[]> {
  const resolved: string[] = []
  const resolver = createResolver(base)

logger.debug(`resolveNuxtModule(base=${base},paths=${paths}): resolver → ${resolver}`);
  for (const path of paths) {
	logger.debug(`>>> Entering resolveNuxtModule(base=${base},paths=${paths})`);
    if (path.startsWith(base)) {
      resolved.push(path.split('/index.ts')[0]!)
      continue
    }
    const resolvedPath = await resolver.resolvePath(path)
    const dir = parseNodeModulePath(resolvedPath).dir
	logger.debug(`resolveNuxtModule(base=${base},paths=${paths}): resolvedPath → ${resolvedPath}`);
	logger.debug(`resolveNuxtModule(base=${base},paths=${paths}): dir → ${dir}`);
    if (dir) {
      resolved.push(dir)
      continue
    }
    const index = resolvedPath.lastIndexOf(path)
	logger.debug(`<<< Exiting resolveNuxtModule(base=${base},paths=${paths})`);
    resolved.push(index === -1 ? dirname(resolvedPath) : resolvedPath.slice(0, index + path.length))
  }

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
  if (opts?.virtual && existsInVFS(path)) {
	logger.debug(`>>> Entering _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs})`);
    return {
      path,
      type: 'file',
      virtual: true,
    }
	logger.debug(`>>> Entering existsInVFS(path=${path},nuxt=${nuxt})`);
	logger.error(`Exception in _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs}): (no error binding)`);
	logger.debug(`<<< Exiting _resolvePathType(path=${path},opts=${opts},skipFs=${skipFs})`);
	logger.debug(`<<< Exiting existsInVFS(path=${path},nuxt=${nuxt})`);
  }

  if (skipFs) {
    return
  }

  const stats = await fsp.stat(path).catch(() => null)
  if (stats) {
logger.debug(`_resolvePathType(path=${path},opts=${opts},skipFs=${skipFs}): stats → ${stats}`);
    return {
      path,
      type: stats.isFile() ? 'file' : 'dir',
      virtual: false,
    }
  }
}

function normalizeExtension (ext: string) {
logger.debug(`>>> Entering normalizeExtension(ext=${ext})`);
logger.debug(`<<< Exiting normalizeExtension(ext=${ext})`);
  return ext.startsWith('.') ? ext : `.${ext}`
}

async function _resolvePathGranularly (path: string, opts: RequirePicked<ResolvePathOptions, 'type'> = { type: 'file' }): Promise<PathResolution> {
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
logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): nuxt → ${nuxt}`);
logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): cwd → ${cwd}`);
logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): extensions → ${extensions}`);

  // Resolve aliases
  path = _resolveAlias(path, opts.alias ?? nuxt?.options.alias ?? {})

  // Resolve relative to cwd
  if (!isAbsolute(path)) {
    path = resolve(cwd, path)
  }

  const res = await _resolvePathType(path, opts)
  if (res && res.type === opts.type) {
logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): res → ${res}`);
    return res
  }

  // Check possible extensions
  if (opts.type === 'file') {
    for (const ext of extensions) {
      const normalizedExt = normalizeExtension(ext)

	logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): normalizedExt → ${normalizedExt}`);
      // path.[ext]
      const extPath = await _resolvePathType(path + normalizedExt, opts)
      if (extPath && extPath.type === 'file') {
	logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): extPath → ${extPath}`);
        return extPath
      }

      // path/index.[ext]
      const indexPath = await _resolvePathType(join(path, 'index' + normalizedExt), opts, res?.type !== 'dir' /* skip checking if parent is not a directory */)
      if (indexPath && indexPath.type === 'file') {
	logger.debug(`_resolvePathGranularly(path=${path},opts=${opts}): indexPath → ${indexPath}`);
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
}

async function existsSensitive (path: string) {
logger.debug(`>>> Entering existsSensitive(path=${path})`);
  const dirFiles = new Set(await fsp.readdir(dirname(path)).catch(() => []))
logger.debug(`existsSensitive(path=${path}): dirFiles → ${dirFiles}`);
logger.debug(`<<< Exiting existsSensitive(path=${path})`);
  return dirFiles.has(basename(path))
}

function existsInVFS (path: string, nuxt = tryUseNuxt()) {
logger.debug(`>>> Entering existsInVFS(path=${path},nuxt=${nuxt})`);
  if (!nuxt) { return false }

  if (path in nuxt.vfs) {
    return true
  }

  const templates = nuxt.apps.default?.templates ?? nuxt.options.build.templates
logger.debug(`<<< Exiting existsInVFS(path=${path},nuxt=${nuxt})`);
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
  const files: string[] = []
  for (const p of await glob(pattern, { cwd: path, followSymbolicLinks: opts.followSymbolicLinks ?? true, absolute: true, ignore: opts.ignore })) {
	logger.debug(`>>> Entering resolveFiles(path=${path},pattern=${pattern},opts=${opts})`);
    if (!isIgnored(p)) {
      files.push(p)
	logger.debug(`<<< Exiting resolveFiles(path=${path},pattern=${pattern},opts=${opts})`);
    }
  }
  return files.sort()
}
