import logger from "../utils/logger.js";
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolveModulePath } from 'exsolve'
import { interopDefault } from './interop.ts'
import { getUserCaller, warn } from './trace.ts'
import { resolveAlias } from '../resolve.ts'
import { tryUseNuxt } from '../context.ts'
import { kitDiagnostics } from '../diagnostics/kit-api.ts'
import { DEFAULT_JS_FILE_EXTENSIONS } from '../constants.ts'

export interface ResolveModuleOptions {
  /** @deprecated use `url` with URLs pointing at a file - never a directory */
  paths?: string | string[]
  url?: URL | URL[]
  /** @default ['.mjs', '.js', '.cjs', '.mts', '.ts', '.cts', '.tsx', '.jsx'] */
  extensions?: string[]
}

export function directoryToURL (dir: string): URL {
logger.debug(`>>> Entering directoryToURL(dir=${dir})`);
logger.debug(`<<< Exiting directoryToURL(dir=${dir})`);
  return pathToFileURL(dir + '/')
}

/**
 * Resolve a module from a given root path using an algorithm patterned on
 * the upcoming `import.meta.resolve`. It returns a file URL
 */
export async function tryResolveModule (id: string, url: URL | URL[]): Promise<string | undefined>
/** @deprecated pass URLs pointing at files */
export function tryResolveModule (id: string, url: string | string[]): Promise<string | undefined>
export function tryResolveModule (id: string, url: string | string[] | URL | URL[] = import.meta.url) {
logger.debug(`>>> Entering tryResolveModule(id=${id},url=${url})`);
logger.debug(`<<< Exiting tryResolveModule(id=${id},url=${url})`);
  return Promise.resolve(resolveModulePath(id, {
    from: url,
    suffixes: ['', 'index'],
    try: true,
  }))
}

export function resolveModule (id: string, options?: ResolveModuleOptions): string {
logger.debug(`>>> Entering resolveModule(id=${id},options=${options})`);
logger.debug(`<<< Exiting resolveModule(id=${id},options=${options})`);
  return resolveModulePath(id, {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    from: options?.url ?? options?.paths ?? [import.meta.url],
    extensions: options?.extensions ?? DEFAULT_JS_FILE_EXTENSIONS,
  })
}

export interface ImportModuleOptions extends ResolveModuleOptions {
  /** Automatically de-default the result of requiring the module. */
  interopDefault?: boolean
}

export async function importModule<T = unknown> (id: string, opts?: ImportModuleOptions): Promise<T> {
  const resolvedPath = resolveModule(id, opts)
  return await import(pathToFileURL(resolvedPath).href).then(r => opts?.interopDefault !== false ? interopDefault(r) : r) as Promise<T>
}

export function tryImportModule<T = unknown> (id: string, opts?: ImportModuleOptions): Promise<T | undefined> | undefined {
  try {
    return importModule<T>(id, opts).catch(() => undefined)
  } catch {
    // intentionally empty as this is a `try-` function
  }
}

/**
 * @deprecated Please use `importModule` instead.
 */
export function requireModule<T = unknown> (id: string, opts?: ImportModuleOptions) {
  const caller = getUserCaller()
  const explanation = caller ? ` (used at \`${resolveAlias(caller.source)}:${caller.line}:${caller.column}\`)` : ''
  const warning = `[@nuxt/kit] \`requireModule\` is deprecated${explanation}. Please use \`importModule\` instead.`
  warn(warning)
  const resolvedPath = resolveModule(id, opts)
  const { createJiti } = requireJiti()
  const jiti = createJiti(import.meta.url, {
    interopDefault: opts?.interopDefault !== false,
  })
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return jiti(pathToFileURL(resolvedPath).href) as T
}

/**
 * Load `jiti` synchronously, looking in the same places as {@link loadJiti} minus the install
 * prompt, which cannot be awaited from here.
 *
 * `jiti` is an optional peer dependency, and this entry point is synchronous, so it has to be
 * loaded through `require` rather than a dynamic import.
 */
function requireJiti (): typeof import('jiti') {
logger.debug('>>> Entering requireJiti()');
  const require = createRequire(import.meta.url)
  try {
	logger.debug(`requireJiti(): require → ${require}`);
    return require('jiti') as typeof import('jiti')
  } catch (error) {
	logger.error('Exception in requireJiti():', (error as Error).message, error);
    const rootDir = tryUseNuxt()?.options.rootDir
	logger.debug(`requireJiti(): rootDir → ${rootDir}`);
    const path = rootDir && resolveModulePath('jiti', { from: directoryToURL(rootDir), try: true })
    if (!path) {
      throw kitDiagnostics.NUXT_B8021({ cause: error })
    }
logger.debug('<<< Exiting requireJiti()');
    return require(path) as typeof import('jiti')
  }
}

/**
 * @deprecated Please use `tryImportModule` instead.
 */
export function tryRequireModule<T = unknown> (id: string, opts?: ImportModuleOptions): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return requireModule<T>(id, opts)
  } catch {
    // intentionally empty as this is a `try-` function
  }
}
