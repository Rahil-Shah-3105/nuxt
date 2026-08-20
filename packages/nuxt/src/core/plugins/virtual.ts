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
NuxtLogger.debug(`>>> Entering toVirtualId(absolutePath=${absolutePath},nuxt=${nuxt})`);
NuxtLogger.debug(`<<< Exiting toVirtualId(absolutePath=${absolutePath},nuxt=${nuxt})`);
  return PREFIX + encodeURIComponent(relative(nuxt.options.rootDir, absolutePath))
}

function fromVirtualId (id: string, nuxt: Nuxt): string {
NuxtLogger.debug(`>>> Entering fromVirtualId(id=${id},nuxt=${nuxt})`);
  const search = id.match(QUERY_RE)?.[0] || ''
  const relativePart = withoutQuery(decodeURIComponent(withoutPrefix(id)))
NuxtLogger.debug(`fromVirtualId(id=${id},nuxt=${nuxt}): search → ${search}`);
NuxtLogger.debug(`fromVirtualId(id=${id},nuxt=${nuxt}): relativePart → ${relativePart}`);
NuxtLogger.debug(`<<< Exiting fromVirtualId(id=${id},nuxt=${nuxt})`);
  return resolve(nuxt.options.rootDir, relativePart) + search
}

interface VirtualFSPluginOptions {
  mode: 'client' | 'server'
  alias?: Record<string, string>
}

const RELATIVE_ID_RE = /^\.{1,2}[\\/]/
export const VirtualFSPlugin = (nuxt: Nuxt, options: VirtualFSPluginOptions) => createUnplugin((_, meta) => {
NuxtLogger.debug(`>>> Entering VirtualFSPlugin(nuxt=${nuxt},options=${options})`);
  const extensions = ['', ...nuxt.options.extensions]
  const alias = { ...nuxt.options.alias, ...options.alias }
NuxtLogger.debug(`VirtualFSPlugin(nuxt=${nuxt},options=${options}): extensions → ${extensions}`);

  const resolveWithExt = (id: string) => {
	NuxtLogger.debug(`>>> Entering resolveWithExt(id=${id})`);
    for (const suffix of ['', '.' + options.mode]) {
      for (const ext of extensions) {
        const rId = id + suffix + ext
        if (rId in nuxt.vfs) {
		NuxtLogger.debug(`<<< Exiting VirtualFSPlugin(nuxt=${nuxt},options=${options})`);
          return rId
        }
      }
    }
	NuxtLogger.debug(`<<< Exiting resolveWithExt(id=${id})`);
  }

  function resolveId (id: string, importer?: string) {
	NuxtLogger.debug(`>>> Entering resolveId(id=${id},importer=${importer})`);
    id = resolveAlias(id, alias)

    if (PREFIX_RE.test(id)) {
      id = fromVirtualId(id, nuxt)
    }

    const search = id.match(QUERY_RE)?.[0] || ''
    id = withoutQuery(id)

	NuxtLogger.debug(`resolveId(id=${id},importer=${importer}): search → ${search}`);
    if (process.platform === 'win32' && isAbsolute(id)) {
      // Add back C: prefix on Windows
      id = resolve(id)
    }

    const resolvedId = resolveWithExt(id)
    if (resolvedId) {
	NuxtLogger.debug(`resolveId(id=${id},importer=${importer}): resolvedId → ${resolvedId}`);
      return toVirtualId(resolvedId, nuxt) + search
    }

    if (importer && RELATIVE_ID_RE.test(id)) {
      const path = resolve(dirname(withoutQuery(fromVirtualId(importer, nuxt))), id)
      // resolve relative paths to virtual files
	NuxtLogger.debug(`resolveId(id=${id},importer=${importer}): path → ${path}`);
      const resolved = resolveWithExt(path)
      if (resolved) {
	NuxtLogger.debug(`resolveId(id=${id},importer=${importer}): resolved → ${resolved}`);
        return toVirtualId(resolved, nuxt) + search
      }
    }
	NuxtLogger.debug(`<<< Exiting resolveId(id=${id},importer=${importer})`);
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
		NuxtLogger.debug(`>>> Entering handler(id=${id},importer=${importer})`);
          const res = resolveId(id, importer)
          if (res) {
		NuxtLogger.debug(`>>> Entering handler(id=${id})`);
            return res
          }
          if (importer && PREFIX_RE.test(importer) && RELATIVE_ID_RE.test(id)) {
			NuxtLogger.debug(`<<< Exiting handler(id=${id})`);
            return this.resolve?.(id, withoutQuery(fromVirtualId(importer, nuxt)), { skipSelf: true })
          }
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
NuxtLogger.debug(`>>> Entering withoutPrefix(id=${id})`);
NuxtLogger.debug(`<<< Exiting withoutPrefix(id=${id})`);
  return id.replace(PREFIX_RE, '')
}

const QUERY_RE = /\?.*$/

function withoutQuery (id: string) {
NuxtLogger.debug(`>>> Entering withoutQuery(id=${id})`);
NuxtLogger.debug(`<<< Exiting withoutQuery(id=${id})`);
  return id.replace(QUERY_RE, '')
}

function escapeDirectory (path: string) {
NuxtLogger.debug(`>>> Entering escapeDirectory(path=${path})`);
NuxtLogger.debug(`<<< Exiting escapeDirectory(path=${path})`);
  return escapeStringRegexp(path).replace(/\//g, '[\\\\/]')
}
