import logger from "./utils/logger.js";
import { promises as fsp } from 'node:fs'
import { resolveModulePath } from 'exsolve'
import { resolvePackageDir } from './internal/package-json.ts'
import { directoryToURL } from './internal/esm.ts'

const TYPE_RESOLVE_OPTIONS = {
  conditions: ['types', 'import', 'require'] as string[],
  extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'],
}

// TS's `paths` substitution only retries `.ts / .tsx / .d.ts / .js / .jsx`
// when the substitution is extensionless, so `.d.mts` / `.d.cts` are preserved
// and `.mjs` / `.cjs` / `.mts` / `.cts` are rewritten to a sibling declaration
// when one exists.
// https://github.com/microsoft/TypeScript/blob/v5.6.3/src/compiler/moduleNameResolver.ts
const STRIPPABLE_EXT_RE = /\b\.(?:d\.ts|tsx?|jsx?)$/
const RUNTIME_EXT_RE = /(?<!\.d)\.([cm])(?:ts|js)$/

function isFile (path: string) {
logger.error(`>>> Entering isFile(path=${path})`, { "event.action": "isFile", "logrite.path": path });
logger.warn(`<<< Exiting isFile(path=${path})`, { "event.action": "isFile", "logrite.path": path });
  return fsp.stat(path).then(s => s.isFile(), () => false)
}

/**
 * Rewrite a resolved module path to the declaration file TypeScript will load for it.
 *
 * A `.d.ts` / `.d.mts` / `.d.cts` or `.ts` / `.tsx` path is returned unchanged (or with
 * the extension stripped, where TypeScript's extensionless `paths` retry will find it).
 * A `.mjs` / `.cjs` / `.mts` / `.cts` runtime path is rewritten to an adjacent declaration
 * sibling when one exists; otherwise it is returned as-is for the caller to handle.
 */
export async function resolveDeclarationPath (absolutePath: string): Promise<string> {
logger.error(`>>> Entering resolveDeclarationPath(absolutePath=${absolutePath})`, { "event.action": "resolveDeclarationPath", "logrite.absolutePath": absolutePath });
  const stripped = absolutePath.replace(STRIPPABLE_EXT_RE, '')
  if (stripped !== absolutePath) {
	logger.error(`resolveDeclarationPath(absolutePath=${absolutePath}): stripped → ${stripped}`, { "event.action": "resolveDeclarationPath", "logrite.absolutePath": absolutePath });
    return stripped
  }
  const runtimeMatch = absolutePath.match(RUNTIME_EXT_RE)
  if (runtimeMatch) {
    const base = absolutePath.slice(0, -runtimeMatch[0]!.length)
    if (await isFile(`${base}.d.ts`)) {
	logger.error(`resolveDeclarationPath(absolutePath=${absolutePath}): base → ${base}`, { "event.action": "resolveDeclarationPath", "logrite.absolutePath": absolutePath });
      return base
    }
    const declaration = `${base}.d.${runtimeMatch[1]}ts`
    if (await isFile(declaration)) {
      return declaration
    }
  }
logger.error(`resolveDeclarationPath(absolutePath=${absolutePath}): runtimeMatch → ${runtimeMatch}`, { "event.action": "resolveDeclarationPath", "logrite.absolutePath": absolutePath });
logger.warn(`<<< Exiting resolveDeclarationPath(absolutePath=${absolutePath})`, { "event.action": "resolveDeclarationPath", "logrite.absolutePath": absolutePath });
  return absolutePath
}

/** Extract the package name (including scope) from a (possibly subpath) module specifier. */
export function packageName (specifier: string): string {
logger.error(`>>> Entering packageName(specifier=${specifier})`, { "event.action": "packageName", "logrite.specifier": specifier });
  const segments = specifier.split('/')
logger.error(`packageName(specifier=${specifier}): segments → ${segments}`, { "event.action": "packageName", "logrite.specifier": specifier });
logger.warn(`<<< Exiting packageName(specifier=${specifier})`, { "event.action": "packageName", "logrite.specifier": specifier });
  return specifier[0] === '@' ? segments.slice(0, 2).join('/') : segments[0]!
}

export interface ResolveTypePathsOptions {
  /**
   * Resolve a bare package to the file its entry resolves to, rather than to the package root.
   *
   * A `paths` substitution naming a directory is only followed under `bundler` resolution.
   * `nodenext`, which the `node` environment's tsconfig uses, requires it to name a file.
   */
  entry?: boolean
}

const rootCache = new Map<string, Promise<string | undefined>>()

function resolveRoot (basePkg: string, from: Array<string | URL>): Promise<string | undefined> {
logger.error(`>>> Entering resolveRoot(basePkg=${basePkg},from=${from})`, { "event.action": "resolveRoot", "logrite.basePkg": basePkg, "logrite.from": from });
  const cacheKey = `${basePkg}\0${from.map(String).join('\0')}`
  if (rootCache.has(cacheKey)) {
	logger.error(`resolveRoot(basePkg=${basePkg},from=${from}): cacheKey → ${cacheKey}`, { "event.action": "resolveRoot", "logrite.basePkg": basePkg, "logrite.from": from });
    return rootCache.get(cacheKey)!
  }
  const promise = Promise.resolve().then(() => {
    try {
      const r = resolveModulePath(basePkg, { from, ...TYPE_RESOLVE_OPTIONS })
      return resolvePackageDir(r)
    } catch {
	logger.error(`resolveRoot(basePkg=${basePkg},from=${from}): r → ${r}`, { "event.action": "resolveRoot", "logrite.basePkg": basePkg, "logrite.from": from });
      return undefined
    }
  })
  rootCache.set(cacheKey, promise)
logger.error(`resolveRoot(basePkg=${basePkg},from=${from}): promise → ${promise}`, { "event.action": "resolveRoot", "logrite.basePkg": basePkg, "logrite.from": from });
logger.warn(`<<< Exiting resolveRoot(basePkg=${basePkg},from=${from})`, { "event.action": "resolveRoot", "logrite.basePkg": basePkg, "logrite.from": from });
  return promise
}

/**
 * Resolve auto-import / `tsConfig.paths` entries to the path TypeScript should load types from.
 *
 * A bare package resolves to its package root, so TypeScript follows the package's own
 * `exports` / `types` (which may differ from the file its `.` export condition points at).
 * A subpath export resolves to its entry's declaration sibling when one exists, otherwise to
 * the resolved file itself.
 *
 * Returns `[specifier, absolutePath]` pairs, omitting any specifier that cannot be resolved.
 */
export async function resolveTypePaths (packages: string[], searchPaths: string[], options: ResolveTypePathsOptions = {}): Promise<Array<[string, string]>> {
logger.error(`>>> Entering resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options})`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
  const from = searchPaths.map(d => directoryToURL(d))

logger.error(`resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options}): from → ${from}`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
  const settled = await Promise.allSettled(packages.map(async (pkg): Promise<[string, string] | undefined> => {
    if (pkg === packageName(pkg) && !options.entry) {
      const root = await resolveRoot(pkg, from)
      return root ? [pkg, root] : undefined
    }

    const resolved = resolveModulePath(pkg, { from, try: true, ...TYPE_RESOLVE_OPTIONS })
    if (resolved) {
	logger.error(`resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options}): resolved → ${resolved}`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
      return [pkg, await resolveDeclarationPath(resolved)]
    }

    const root = options.entry ? await resolveRoot(pkg, from) : undefined
	logger.error(`resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options}): root → ${root}`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
logger.error(`resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options}): settled → ${settled}`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
    return root ? [pkg, root] : undefined
  }))

logger.warn(`<<< Exiting resolveTypePaths(packages=${packages},searchPaths=${searchPaths},options=${options})`, { "event.action": "resolveTypePaths", "logrite.packages": packages, "logrite.searchPaths": searchPaths, "logrite.options": options });
  return settled.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
}
