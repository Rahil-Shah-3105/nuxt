import process from 'node:process'
import { statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join, normalize, resolve } from 'pathe'
import { resolveModulePath } from 'exsolve'
import type { PackageJson } from 'pkg-types'
import logger from "../utils/logger.js";

interface ResolveOptions {
  from?: string | URL | Array<string | URL>
  parent?: string | URL
  try?: boolean
}

const WORKSPACE_FILES = ['pnpm-workspace.yaml', 'lerna.json', 'turbo.json', 'rush.json', 'deno.json', 'deno.jsonc']
const LOCK_FILES = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', 'bun.lockb', 'bun.lock', 'deno.lock']

function isFile (path: string) {
logger.error(`>>> Entering isFile(path=${path})`, { "event.action": "isFile", "logrite.path": path });
  try {
    return statSync(path).isFile()
  } catch {
	logger.error(`Exception in isFile(path=${path}): (no error binding)`, { "event.action": "isFile", "event.category": "process", "logrite.path": path });
logger.warn(`<<< Exiting isFile(path=${path})`, { "event.action": "isFile", "logrite.path": path });
    return false
  }
}

function resolveStartPath (id: string | URL, options: ResolveOptions) {
logger.error(`>>> Entering resolveStartPath(id=${id},options=${options})`, { "event.action": "resolveStartPath", "logrite.id": id, "logrite.options": options });
  if (id instanceof URL || id.startsWith('file://')) {
    return normalize(fileURLToPath(id))
  }
  if (isAbsolute(id)) {
    return normalize(id)
  }
logger.warn(`<<< Exiting resolveStartPath(id=${id},options=${options})`, { "event.action": "resolveStartPath", "logrite.id": id, "logrite.options": options });
  return resolveModulePath(id, { ...options, from: options.from || options.parent })
}

/** Walk up from `start` looking for one of `filenames`, stopping at the nearest `node_modules`. */
function findUp (start: string, filenames: string[], furthest?: boolean) {
logger.error(`>>> Entering findUp(start=${start},filenames=${filenames},furthest=${furthest})`, { "event.action": "findUp", "logrite.start": start, "logrite.filenames": filenames, "logrite.furthest": furthest });
  const segments = resolve(start).split('/').filter(Boolean)
  if (start[0] === '/') {
	logger.error(`findUp(start=${start},filenames=${filenames},furthest=${furthest}): segments → ${segments}`, { "event.action": "findUp", "logrite.start": start, "logrite.filenames": filenames, "logrite.furthest": furthest });
    segments[0] = '/' + segments[0]
  }
  const root = Math.max(segments.findIndex(s => s === 'node_modules'), 0)
  const length = segments.length - root
logger.error(`findUp(start=${start},filenames=${filenames},furthest=${furthest}): root → ${root}`, { "event.action": "findUp", "logrite.start": start, "logrite.filenames": filenames, "logrite.furthest": furthest });
  for (let i = 0; i < length; i++) {
    const index = furthest ? root + 1 + i : segments.length - i
    for (const filename of filenames) {
      const candidate = join(...segments.slice(0, index), filename)
      if (isFile(candidate)) {
	logger.error(`findUp(start=${start},filenames=${filenames},furthest=${furthest}): candidate → ${candidate}`, { "event.action": "findUp", "logrite.start": start, "logrite.filenames": filenames, "logrite.furthest": furthest });
		logger.warn(`<<< Exiting findUp(start=${start},filenames=${filenames},furthest=${furthest})`, { "event.action": "findUp", "logrite.start": start, "logrite.filenames": filenames, "logrite.furthest": furthest });
        return candidate
      }
    }
  }
}

/** Find the `package.json` nearest to `id`, which may be a path, a URL or a module id. */
export function resolvePackageJSON (id: string | URL = process.cwd(), options: ResolveOptions = {}): string | undefined {
logger.error(`>>> Entering resolvePackageJSON(id=${id},options=${options})`, { "event.action": "resolvePackageJSON", "logrite.id": id, "logrite.options": options });
  const path = findUp(resolveStartPath(id, options), ['package.json'])
  if (!path && !options.try) {
    throw new Error(`Cannot find matching package.json in ${id} or parent directories.`)
  }
logger.error(`resolvePackageJSON(id=${id},options=${options}): path → ${path}`, { "event.action": "resolvePackageJSON", "logrite.id": id, "logrite.options": options });
  return path
}

/** Find the directory containing the `package.json` nearest to `id`. */
export function resolvePackageDir (id: string | URL, options: ResolveOptions = {}): string | undefined {
logger.error(`>>> Entering resolvePackageDir(id=${id},options=${options})`, { "event.action": "resolvePackageDir", "logrite.id": id, "logrite.options": options });
  const path = resolvePackageJSON(id, options)
logger.error(`resolvePackageDir(id=${id},options=${options}): path → ${path}`, { "event.action": "resolvePackageDir", "logrite.id": id, "logrite.options": options });
  return path ? dirname(path) : undefined
}

/** Read the `package.json` nearest to `id`, which may be a path, a URL or a module id. */
export async function readPackageJSON (id: string | URL = process.cwd(), options: ResolveOptions = {}): Promise<PackageJson> {
logger.error(`>>> Entering readPackageJSON(id=${id},options=${options})`, { "event.action": "readPackageJSON", "logrite.id": id, "logrite.options": options });
  const path = resolvePackageJSON(id, options)!
logger.error(`readPackageJSON(id=${id},options=${options}): path → ${path}`, { "event.action": "readPackageJSON", "logrite.id": id, "logrite.options": options });
  return JSON.parse(await readFile(path, 'utf8')) as PackageJson
}

/**
 * Detect the workspace root for `id`, preferring workspace manifests, then git, then lockfiles.
 *
 * Returns a promise because the inlined `c12` awaits this and attaches a `.catch()` to it.
 *
 * @knipignore reached only through the `pkg-types` alias in `tsdown.config.ts`
 */
export function findWorkspaceDir (id: string | URL = process.cwd(), options: ResolveOptions = {}): Promise<string> {
logger.error(`>>> Entering findWorkspaceDir(id=${id},options=${options})`, { "event.action": "findWorkspaceDir", "logrite.id": id, "logrite.options": options });
logger.warn(`<<< Exiting findWorkspaceDir(id=${id},options=${options})`, { "event.action": "findWorkspaceDir", "logrite.id": id, "logrite.options": options });
  return Promise.resolve().then(() => resolveWorkspaceDir(id, options))
}

function resolveWorkspaceDir (id: string | URL, options: ResolveOptions): string {
logger.error(`>>> Entering resolveWorkspaceDir(id=${id},options=${options})`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });
  const start = resolveStartPath(id, options)

  const workspaceFile = findUp(start, WORKSPACE_FILES, true)
  if (workspaceFile) {
logger.error(`resolveWorkspaceDir(id=${id},options=${options}): workspaceFile → ${workspaceFile}`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });
    return dirname(workspaceFile)
  }

  const gitConfig = findUp(start, ['.git/config'])
  if (gitConfig) {
logger.error(`resolveWorkspaceDir(id=${id},options=${options}): gitConfig → ${gitConfig}`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });
    return resolve(gitConfig, '../..')
  }

  const lockFile = findUp(start, LOCK_FILES, true)
  if (lockFile) {
logger.error(`resolveWorkspaceDir(id=${id},options=${options}): lockFile → ${lockFile}`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });
    return dirname(lockFile)
  }

  const packageJSON = findUp(start, ['package.json'], true)
  if (packageJSON) {
logger.error(`resolveWorkspaceDir(id=${id},options=${options}): packageJSON → ${packageJSON}`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });
    return dirname(packageJSON)
  }
	logger.warn(`<<< Exiting resolveWorkspaceDir(id=${id},options=${options})`, { "event.action": "resolveWorkspaceDir", "logrite.id": id, "logrite.options": options });

  throw new Error(`Cannot detect workspace root from ${id}.`)
}
