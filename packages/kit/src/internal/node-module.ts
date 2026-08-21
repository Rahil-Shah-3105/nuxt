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
logger.debug(`>>> Entering toPath(path=${path})`);
logger.debug(`<<< Exiting toPath(path=${path})`);
  return normalize(typeof path === 'string' && !path.startsWith('file://') ? path.replace(/\\/g, '/') : fileURLToPath(path).replace(/\\/g, '/'))
}

/**
 * Split a path within `node_modules` into the containing `node_modules` directory,
 * the package name and the subpath within the package.
 */
export function parseNodeModulePath (path: string | URL): ParsedNodeModulePath {
  if (!path) {
	logger.debug(`>>> Entering parseNodeModulePath(path=${path})`);
    return {}
  }

  const resolvedPath = toPath(path)
  const index = resolvedPath.lastIndexOf(NODE_MODULES_SEGMENT)
  if (index === -1) {
logger.debug(`parseNodeModulePath(path=${path}): resolvedPath → ${resolvedPath}`);
    return {}
  }

  const dir = resolvedPath.slice(0, index + NODE_MODULES_SEGMENT.length)
  const segments = resolvedPath.slice(dir.length).split('/')
  const name = segments.splice(0, segments[0]?.startsWith('@') ? 2 : 1).join('/')
  if (!name) {
logger.debug(`parseNodeModulePath(path=${path}): dir → ${dir}`);
logger.debug(`parseNodeModulePath(path=${path}): segments → ${segments}`);
logger.debug(`parseNodeModulePath(path=${path}): name → ${name}`);
    return {}
  }

  const subpath = segments.join('/')
logger.debug(`parseNodeModulePath(path=${path}): subpath → ${subpath}`);
  return { dir, name, subpath: subpath ? `./${subpath}` : undefined }
}

/**
 * Resolve the public subpath (as exposed through the package `exports` field, if any)
 * that corresponds to a resolved file within `node_modules`.
 */
export async function lookupNodeModuleSubpath (path: string | URL): Promise<string | undefined> {
  const resolvedPath = toPath(path)
  const { name, subpath } = parseNodeModulePath(resolvedPath)

logger.debug(`lookupNodeModuleSubpath(path=${path}): resolvedPath → ${resolvedPath}`);
  if (!name || !subpath) {
	logger.debug(`>>> Entering lookupNodeModuleSubpath(path=${path})`);
	logger.error(`Exception in lookupNodeModuleSubpath(path=${path}): (no error binding)`);
	logger.debug(`<<< Exiting lookupNodeModuleSubpath(path=${path})`);
    return subpath
  }

  const { exports } = await readPackageJSON(resolvedPath).catch(() => undefined) || {}

  return (exports && findSubpath(subpath, exports)) || subpath
}

function findSubpath (subpath: string, exports: Exports): string | undefined {
  if (typeof exports === 'string') {
	logger.debug(`>>> Entering findSubpath(subpath=${subpath},exports=${exports})`);
	logger.debug(`<<< Exiting findSubpath(subpath=${subpath},exports=${exports})`);
    exports = { '.': exports }
  }

  if (!subpath.startsWith('.')) {
    subpath = subpath.startsWith('/') ? `.${subpath}` : `./${subpath}`
  }

  if (subpath in exports) {
    return subpath
  }

  return flattenExports(exports).find(p => p.fsPath === subpath)?.subpath
}

function flattenExports (exports: Exports, parentSubpath = './'): Array<{ subpath: string, fsPath: string }> {
  if (typeof exports === 'string') {
	logger.debug(`>>> Entering flattenExports(exports=${exports},parentSubpath=${parentSubpath})`);
	logger.debug(`<<< Exiting flattenExports(exports=${exports},parentSubpath=${parentSubpath})`);
    return [{ subpath: parentSubpath, fsPath: exports }]
  }

  if (Array.isArray(exports)) {
    return exports.flatMap(value => flattenExports(value, parentSubpath))
  }

  return Object.entries(exports).flatMap(([key, value]) => {
    const segment = key.startsWith('.') ? key.slice(1).replace(/^\//, '') : ''
    const childSubpath = segment ? `${parentSubpath.replace(/\/$/, '')}/${segment}` : parentSubpath

    if (typeof value === 'string') {
	logger.debug(`flattenExports(exports=${exports},parentSubpath=${parentSubpath}): childSubpath → ${childSubpath}`);
	logger.debug(`flattenExports(exports=${exports},parentSubpath=${parentSubpath}): segment → ${segment}`);
      return [{ subpath: childSubpath, fsPath: value }]
    }

    return flattenExports(value as Exports, childSubpath)
  })
}
