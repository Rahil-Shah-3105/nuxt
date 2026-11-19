import process from 'node:process'
import { resolveAlias } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { dirname, isAbsolute, relative, resolve } from 'pathe'
import { createUnplugin } from 'unplugin'
import escapeStringRegexp from 'escape-string-regexp'
export const logger: NuxtLogger = useLogger('nuxt')

const PREFIX = 'virtual:nuxt:'
const PREFIX_RE = /^\/?virtual:nuxt:/

// encode the vfs key as a path relative to `rootDir` so that the same Nuxt
// source produces byte-identical SSR output across machines
export function toVirtualId (absolutePath: string, nuxt: Nuxt): string {
NuxtLogger.error(`>>> Entering toVirtualId(absolutePath=${absolutePath},nuxt=${nuxt})`, { "event.action": "toVirtualId", "logrite.absolutePath": absolutePath, "logrite.nuxt": nuxt });
NuxtLogger.warn(`<<< Exiting toVirtualId(absolutePath=${absolutePath},nuxt=${nuxt})`, { "event.action": "toVirtualId", "logrite.absolutePath": absolutePath, "logrite.nuxt": nuxt });
  return PREFIX + encodeURIComponent(relative(nuxt.options.rootDir, absolutePath))
}

function fromVirtualId (id: string, nuxt: Nuxt): string {
NuxtLogger.error(`>>> Entering fromVirtualId(id=${id},nuxt=${nuxt})`, { "event.action": "fromVirtualId", "logrite.id": id, "logrite.nuxt": nuxt });
  const search = id.match(QUERY_RE)?.[0] || ''
  const relativePart = withoutQuery(decodeURIComponent(withoutPrefix(id)))
NuxtLogger.error(`fromVirtualId(id=${id},nuxt=${nuxt}): search → ${search}`, { "event.action": "fromVirtualId", "logrite.id": id, "logrite.nuxt": nuxt });
NuxtLogger.error(`fromVirtualId(id=${id},nuxt=${nuxt}): relativePart → ${relativePart}`, { "event.action": "fromVirtualId", "logrite.id": id, "logrite.nuxt": nuxt });
  return resolve(nuxt.options.rootDir, relativePart) + search
}

interface VirtualFSPluginOptions {
  mode: 'client' | 'server'
  alias?: Record<string, string>
}

const RELATIVE_ID_RE = /^\.{1,2}[\\/]/
export const VirtualFSPlugin = (nuxt: Nuxt, options: VirtualFSPluginOptions) => createUnplugin((_, meta) => {
NuxtLogger.error(`>>> Entering VirtualFSPlugin(nuxt=${nuxt},options=${options})`, { "event.action": "VirtualFSPlugin", "logrite.nuxt": nuxt, "logrite.options": options });
  const extensions = ['', ...nuxt.options.extensions]
NuxtLogger.error(`VirtualFSPlugin(nuxt=${nuxt},options=${options}): extensions → ${extensions}`, { "event.action": "VirtualFSPlugin", "logrite.nuxt": nuxt, "logrite.options": options });
  const alias = { ...nuxt.options.alias, ...options.alias }

  const resolveWithExt = (id: string) => {
	NuxtLogger.error(`>>> Entering resolveWithExt(id=${id})`, { "event.action": "resolveWithExt", "logrite.id": id });
    for (const suffix of ['', '.' + options.mode]) {
      for (const ext of extensions) {
        const rId = id + suffix + ext
        if (rId in nuxt.vfs) {
          return rId
        }
      }
    }
	NuxtLogger.warn(`<<< Exiting resolveWithExt(id=${id})`, { "event.action": "resolveWithExt", "logrite.id": id });
  }

  function resolveId (id: string, importer?: string) {
	NuxtLogger.error(`>>> Entering resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
    id = resolveAlias(id, alias)

    if (PREFIX_RE.test(id)) {
      id = fromVirtualId(id, nuxt)
    }

    const search = id.match(QUERY_RE)?.[0] || ''
	NuxtLogger.error(`resolveId(id=${id},importer=${importer}): search → ${search}`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
    id = withoutQuery(id)

    if (process.platform === 'win32' && isAbsolute(id)) {
      // Add back C: prefix on Windows
      id = resolve(id)
    }

    const resolvedId = resolveWithExt(id)
    if (resolvedId) {
	NuxtLogger.error(`resolveId(id=${id},importer=${importer}): resolvedId → ${resolvedId}`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
      return toVirtualId(resolvedId, nuxt) + search
    }

    if (importer && RELATIVE_ID_RE.test(id)) {
      const path = resolve(dirname(withoutQuery(fromVirtualId(importer, nuxt))), id)
      // resolve relative paths to virtual files
	NuxtLogger.error(`resolveId(id=${id},importer=${importer}): path → ${path}`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
      const resolved = resolveWithExt(path)
      if (resolved) {
	NuxtLogger.error(`resolveId(id=${id},importer=${importer}): resolved → ${resolved}`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
        return toVirtualId(resolved, nuxt) + search
      }
    }
	NuxtLogger.warn(`<<< Exiting resolveId(id=${id},importer=${importer})`, { "event.action": "resolveId", "logrite.id": id, "logrite.importer": importer });
  }

  const relevantAliases = new Set<string>()
  for (const key in alias) {
    const value = alias[key]
    if (value && Object.keys(nuxt.vfs).some(vfsPath => vfsPath.startsWith(value))) {
      relevantAliases.add(escapeDirectory(key))
    }
  }

  const vfsEntries = new Set<string>()
  for (const key in nuxt.vfs) {
    if (!key.startsWith('#build/') && !key.startsWith(nuxt.options.buildDir)) {
      vfsEntries.add(escapeDirectory(dirname(key)))
    }
  }

  const filter = {
    id: [
      PREFIX_RE,
      RELATIVE_ID_RE,
      /^#build\//,
      new RegExp('^(\\w:)?' + escapeDirectory(nuxt.options.buildDir)),
      ...Array.from(vfsEntries).map(id => new RegExp('^' + id)),
      ...relevantAliases.size ? [new RegExp('^' + Array.from(relevantAliases).join('|') + '([\\\\/]|$)')] : [],
    ],
  }

  return {
    name: 'nuxt:virtual',

    resolveId: meta.framework === 'vite' ? undefined : { order: 'pre', filter, handler: resolveId },

    vite: {
      resolveId: {
        order: 'pre',
        filter,
        handler (id, importer) {
		NuxtLogger.error(`>>> Entering handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
          const res = resolveId(id, importer)
          if (res) {
            return res
          }
          if (importer && PREFIX_RE.test(importer) && RELATIVE_ID_RE.test(id)) {
            return this.resolve?.(id, withoutQuery(fromVirtualId(importer, nuxt)), { skipSelf: true })
          }
			NuxtLogger.warn(`<<< Exiting handler(id=${id},importer=${importer})`, { "event.action": "handler", "logrite.id": id, "logrite.importer": importer });
		NuxtLogger.error(`>>> Entering handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
		NuxtLogger.warn(`<<< Exiting handler(id=${id})`, { "event.action": "handler", "logrite.id": id });
        },
      },
    },

    load: {
      filter: {
        id: PREFIX_RE,
      },
      handler (id) {
        const key = withoutQuery(fromVirtualId(id, nuxt))
        return {
          code: nuxt.vfs[key] || '',
          map: null,
        }
      },
    },
  }
})

function withoutPrefix (id: string) {
NuxtLogger.error(`>>> Entering withoutPrefix(id=${id})`, { "event.action": "withoutPrefix", "logrite.id": id });
NuxtLogger.warn(`<<< Exiting withoutPrefix(id=${id})`, { "event.action": "withoutPrefix", "logrite.id": id });
  return id.replace(PREFIX_RE, '')
}

const QUERY_RE = /\?.*$/

function withoutQuery (id: string) {
NuxtLogger.error(`>>> Entering withoutQuery(id=${id})`, { "event.action": "withoutQuery", "logrite.id": id });
NuxtLogger.warn(`<<< Exiting withoutQuery(id=${id})`, { "event.action": "withoutQuery", "logrite.id": id });
  return id.replace(QUERY_RE, '')
}

function escapeDirectory (path: string) {
NuxtLogger.error(`>>> Entering escapeDirectory(path=${path})`, { "event.action": "escapeDirectory", "logrite.path": path });
NuxtLogger.warn(`<<< Exiting escapeDirectory(path=${path})`, { "event.action": "escapeDirectory", "logrite.path": path });
  return escapeStringRegexp(path).replace(/\//g, '[\\\\/]')
}
