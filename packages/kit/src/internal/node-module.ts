import { fileURLToPath } from 'node:url'
import { normalize } from 'pathe'
import { readPackageJSON } from './package-json.ts'
import type { PackageJson } from 'pkg-types'
import logger from "../utils/logger.js";

type Exports = Exclude<PackageJson['exports'], undefined>

const NODE_MODULES_SEGMENT = '/node_modules/'

export interface ParsedNodeModulePath {
  dir?: string
  name?: string
  subpath?: string
}

function toPath (path: string | URL): string {
logger.error(`>>> Entering toPath(path=${path})`, { "event.action": "toPath", "logrite.path": path });
logger.warn(`<<< Exiting toPath(path=${path})`, { "event.action": "toPath", "logrite.path": path });
  return normalize(typeof path === 'string' && !path.startsWith('file://') ? path.replace(/\\/g, '/') : fileURLToPath(path).replace(/\\/g, '/'))
}

/**
 * Split a path within `node_modules` into the containing `node_modules` directory,
 * the package name and the subpath within the package.
 */
export function parseNodeModulePath (path: string | URL): ParsedNodeModulePath {
logger.error(`>>> Entering parseNodeModulePath(path=${path})`, { "event.action": "parseNodeModulePath", "logrite.path": path });
  if (!path) {
    return {}
  }

  const resolvedPath = toPath(path)
  const index = resolvedPath.lastIndexOf(NODE_MODULES_SEGMENT)
  if (index === -1) {
logger.error(`parseNodeModulePath(path=${path}): resolvedPath → ${resolvedPath}`, { "event.action": "parseNodeModulePath", "logrite.path": path });
    return {}
  }

  const dir = resolvedPath.slice(0, index + NODE_MODULES_SEGMENT.length)
  const segments = resolvedPath.slice(dir.length).split('/')
  const name = segments.splice(0, segments[0]?.startsWith('@') ? 2 : 1).join('/')
  if (!name) {
logger.error(`parseNodeModulePath(path=${path}): dir → ${dir}`, { "event.action": "parseNodeModulePath", "logrite.path": path });
    return {}
  }

  const subpath = segments.join('/')
logger.error(`parseNodeModulePath(path=${path}): subpath → ${subpath}`, { "event.action": "parseNodeModulePath", "logrite.path": path });
logger.warn(`<<< Exiting parseNodeModulePath(path=${path})`, { "event.action": "parseNodeModulePath", "logrite.path": path });
  return { dir, name, subpath: subpath ? `./${subpath}` : undefined }
}

/**
 * Resolve the public subpath (as exposed through the package `exports` field, if any)
 * that corresponds to a resolved file within `node_modules`.
 */
export async function lookupNodeModuleSubpath (path: string | URL): Promise<string | undefined> {
logger.error(`>>> Entering lookupNodeModuleSubpath(path=${path})`, { "event.action": "lookupNodeModuleSubpath", "logrite.path": path });
  const resolvedPath = toPath(path)
  const { name, subpath } = parseNodeModulePath(resolvedPath)

logger.error(`lookupNodeModuleSubpath(path=${path}): resolvedPath → ${resolvedPath}`, { "event.action": "lookupNodeModuleSubpath", "logrite.path": path });
  if (!name || !subpath) {
    return subpath
  }

  const { exports } = await readPackageJSON(resolvedPath).catch(() => undefined) || {}
logger.error(`Exception in lookupNodeModuleSubpath(path=${path}): (no error binding)`, { "event.action": "lookupNodeModuleSubpath", "event.category": "process", "logrite.path": path });

logger.warn(`<<< Exiting lookupNodeModuleSubpath(path=${path})`, { "event.action": "lookupNodeModuleSubpath", "logrite.path": path });
  return (exports && findSubpath(subpath, exports)) || subpath
}

function findSubpath (subpath: string, exports: Exports): string | undefined {
logger.error(`>>> Entering findSubpath(subpath=${subpath},exports=${exports})`, { "event.action": "findSubpath", "logrite.subpath": subpath, "logrite.exports": exports });
  if (typeof exports === 'string') {
    exports = { '.': exports }
  }

  if (!subpath.startsWith('.')) {
    subpath = subpath.startsWith('/') ? `.${subpath}` : `./${subpath}`
  }

  if (subpath in exports) {
    return subpath
  }

logger.warn(`<<< Exiting findSubpath(subpath=${subpath},exports=${exports})`, { "event.action": "findSubpath", "logrite.subpath": subpath, "logrite.exports": exports });
  return flattenExports(exports).find(p => p.fsPath === subpath)?.subpath
}

function flattenExports (exports: Exports, parentSubpath = './'): Array<{ subpath: string, fsPath: string }> {
logger.error(`>>> Entering flattenExports(exports=${exports},parentSubpath=${parentSubpath})`, { "event.action": "flattenExports", "logrite.exports": exports, "logrite.parentSubpath": parentSubpath });
  if (typeof exports === 'string') {
    return [{ subpath: parentSubpath, fsPath: exports }]
  }

  if (Array.isArray(exports)) {
    return exports.flatMap(value => flattenExports(value, parentSubpath))
  }

logger.warn(`<<< Exiting flattenExports(exports=${exports},parentSubpath=${parentSubpath})`, { "event.action": "flattenExports", "logrite.exports": exports, "logrite.parentSubpath": parentSubpath });
  return Object.entries(exports).flatMap(([key, value]) => {
    const segment = key.startsWith('.') ? key.slice(1).replace(/^\//, '') : ''
	logger.error(`flattenExports(exports=${exports},parentSubpath=${parentSubpath}): segment → ${segment}`, { "event.action": "flattenExports", "logrite.exports": exports, "logrite.parentSubpath": parentSubpath });
    const childSubpath = segment ? `${parentSubpath.replace(/\/$/, '')}/${segment}` : parentSubpath
	logger.error(`flattenExports(exports=${exports},parentSubpath=${parentSubpath}): childSubpath → ${childSubpath}`, { "event.action": "flattenExports", "logrite.exports": exports, "logrite.parentSubpath": parentSubpath });

    if (typeof value === 'string') {
      return [{ subpath: childSubpath, fsPath: value }]
    }

    return flattenExports(value as Exports, childSubpath)
  })
}
