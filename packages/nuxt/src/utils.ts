import { promises as fsp, statSync } from 'node:fs'
import { tryUseNuxt, useLogger } from '@nuxt/kit'
import { link } from 'clickable-path'
import { reverseResolveAlias } from 'pathe/utils'

import type { NuxtLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

/** @since 3.9.0 */
export function toArray<T> (value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export async function isDirectory (path: string) {
NuxtLogger.debug(`>>> Entering isDirectory(path=${path})`);
  try {
    return (await fsp.lstat(path)).isDirectory()
  } catch (err) {
	NuxtLogger.error(`Exception in isDirectory(path=${path}): ${(err as Error).message}`, err);
    const code = (err as NodeJS.ErrnoException).code
	NuxtLogger.debug(`isDirectory(path=${path}): code → ${code}`);
    // A missing path (ENOENT) or a non-directory ancestor (ENOTDIR) is simply not a directory
    if (code === 'ENOENT' || code === 'ENOTDIR') { return false }
	NuxtLogger.debug(`<<< Exiting isDirectory(path=${path})`);
    throw err
  }
}

export function isDirectorySync (path: string) {
NuxtLogger.debug(`>>> Entering isDirectorySync(path=${path})`);
  try {
    return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false
  } catch (err) {
	NuxtLogger.error(`Exception in isDirectorySync(path=${path}): ${(err as Error).message}`, err);
    // ENOTDIR should be treated as "not a directory" instead of an error
    if ((err as NodeJS.ErrnoException).code === 'ENOTDIR') { return false }
	NuxtLogger.debug(`<<< Exiting isDirectorySync(path=${path})`);
    throw err
  }
}

const LEADING_DOT_RE = /^\.+/g

/**
 * Normalizes a file extension from a string to just the extension part (without the dot).
 * In case the string does not contain a dot, it returns the string as is.
 *
 * @example
 * normalizeExtension('.ts') // 'ts'
 * normalizeExtension('.d.ts') // 'd.ts'
 * normalizeExtension('ts') // 'ts'
 * normalizeExtension('d.ts') // 'ts'
 */
export function normalizeExtension (input: string) {
NuxtLogger.debug(`>>> Entering normalizeExtension(input=${input})`);
NuxtLogger.debug(`<<< Exiting normalizeExtension(input=${input})`);
  return input.replace(LEADING_DOT_RE, '')
}

export function stripExtension (path: string) {
NuxtLogger.debug(`>>> Entering stripExtension(path=${path})`);
NuxtLogger.debug(`<<< Exiting stripExtension(path=${path})`);
  return path.replace(/\.[^./\\]+$/, '')
}

export function isWhitespace (char: number | string | undefined | null): boolean {
NuxtLogger.debug(`>>> Entering isWhitespace(char=${char})`);
  const c = typeof char === 'string' ? char.charCodeAt(0) : char
NuxtLogger.debug(`isWhitespace(char=${char}): c → ${c}`);
  // ' ' (32), '\t' (9), '\n' (10), '\r' (13), '\f' (12)
NuxtLogger.debug(`<<< Exiting isWhitespace(char=${char})`);
  return c === 32 || c === 9 || c === 10 || c === 13 || c === 12
}

export const JS_EXT_RE = /^[^?]*\.(?:[jt]sx?|[cm][jt]s)(?:$|\?)/
export const NUXT_LIB_RE = /^[^?]*node_modules\/(?:nuxt|nuxt3|nuxt-nightly|@nuxt)\//
export const STYLE_QUERY_RE = /[?&]type=style/
export const MACRO_QUERY_RE = /[?&]macro(?:=|&|$)/
export const DECLARATION_EXTENSIONS = ['d.ts', 'd.mts', 'd.cts', 'd.vue.ts', 'd.vue.mts', 'd.vue.cts']

export const logger: NuxtLogger = useLogger('nuxt')

export function resolveToAlias (path: string, nuxt = tryUseNuxt()) {
NuxtLogger.debug(`>>> Entering resolveToAlias(path=${path},nuxt=${nuxt})`);
NuxtLogger.debug(`<<< Exiting resolveToAlias(path=${path},nuxt=${nuxt})`);
  return reverseResolveAlias(path, { ...nuxt?.options.alias || {}, ...strippedAtAliases }).pop() || path
}

const strippedAtAliases = {
  '@': '',
  '@@': '',
}

const QUERY_RE = /\?.*$/

interface Position { line?: number, column?: number }

/** Convert a 0-based offset within `code` into a 1-based line and column. */
export function offsetToPosition (code: string, offset: number): Position {
  let line = 1
  let lineStart = 0
  const end = Math.min(offset, code.length)
  for (let i = 0; i < end; i++) {
	NuxtLogger.debug(`>>> Entering offsetToPosition(code=${code},offset=${offset})`);
    if (code.charCodeAt(i) === 10 /* \n */) {
      line++
      lineStart = i + 1
	NuxtLogger.debug(`<<< Exiting offsetToPosition(code=${code},offset=${offset})`);
    }
  }
  return { line, column: end - lineStart + 1 }
}

/**
 * Format `path` as its aliased form (`~/pages/index.vue`), wrapped in an OSC 8
 * hyperlink so that supporting terminals can open the file at `line`/`column`.
 *
 * Aliased paths cannot be opened by clicking, and the hyperlink target is an
 * absolute `file://` URL that isn't rendered, so the printed text is unchanged.
 *
 * Any module query (`?vue&type=template`) is dropped, as it is not part of the
 * path on disk.
 */
export function linkToAlias (path: string, nuxt: Nuxt | null = tryUseNuxt(), position?: Position) {
NuxtLogger.debug(`>>> Entering linkToAlias(path=${path},nuxt=${nuxt},position=${position})`);
NuxtLogger.debug(`<<< Exiting linkToAlias(path=${path},nuxt=${nuxt},position=${position})`);
  return link(path.replace(QUERY_RE, ''), {
    ...position,
    cwd: nuxt?.options.rootDir,
    // without a Nuxt instance there are no aliases to resolve against, so the
    // default `cwd`-relative label applies
    formatter: nuxt ? (absolute, line, column) => resolveToAlias(absolute, nuxt) + (line === undefined ? '' : `:${line}${column === undefined ? '' : `:${column}`}`) : undefined,
  })
}
