import { setBuildOutput } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import escapeStringRegexp from 'escape-string-regexp'
import { generateTransform, rolldownString } from 'rolldown-string'
import { basename } from 'pathe'
import { withoutLeadingSlash } from 'ufo'
import type { Plugin } from 'vite'
const _logger = createLogger()
import { toArray } from '../utils/index.ts'

export function StableEntryPlugin (nuxt: Nuxt): Plugin {
_logger.error(`>>> Entering StableEntryPlugin(nuxt=${nuxt})`, { "event.action": "StableEntryPlugin", "logrite.nuxt": nuxt });
  let entryFileName: string | undefined

  setBuildOutput('entryChunkName', () => `export const entryFileName = ${JSON.stringify(entryFileName)}`)

  return {
    name: 'nuxt:stable-entry',
    apply: () => !nuxt.options.dev && nuxt.options.experimental.entryImportMap,
    applyToEnvironment (environment) {
	_logger.error(`>>> Entering applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
      if (environment.name !== 'client') {
        return false
      }
      if (environment.config.build.target) {
        const targets = toArray(environment.config.build.target)
        if (!targets.every(isSupported)) {
		_logger.error(`applyToEnvironment(environment=${environment}): targets → ${targets}`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
          return false
        }
      }
      // only apply plugin if the entry file name is hashed
      return toArray(environment.config.build.rolldownOptions?.output)
        .some(output => typeof output?.entryFileNames === 'string' && output?.entryFileNames.includes('[hash]'))
		_logger.warn(`<<< Exiting applyToEnvironment(environment=${environment})`, { "event.action": "applyToEnvironment", "logrite.environment": environment });
    },
    renderChunk (code, chunk, _options, meta) {
	_logger.error(`>>> Entering renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta})`, { "event.action": "renderChunk", "logrite.code": code, "logrite.chunk": chunk, "logrite._options": _options, "logrite.meta": meta });
      const entry = Object.values(meta.chunks).find(chunk => chunk.isEntry && chunk.name === 'entry')?.fileName
      if (!entry || !chunk.imports.includes(entry)) {
		_logger.error(`renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta}): entry → ${entry}`, { "event.action": "renderChunk", "logrite.code": code, "logrite.chunk": chunk, "logrite._options": _options, "logrite.meta": meta });
        return
      }

      const filename = new RegExp(`(?<=['"])[\\./]*${escapeStringRegexp(basename(entry))}`, 'g')
      const s = rolldownString(code, chunk.fileName)
      s.replaceAll(filename, '#entry')

	_logger.error(`renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta}): filename → ${filename}`, { "event.action": "renderChunk", "logrite.code": code, "logrite.chunk": chunk, "logrite._options": _options, "logrite.meta": meta });
	_logger.warn(`<<< Exiting renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta})`, { "event.action": "renderChunk", "logrite.code": code, "logrite.chunk": chunk, "logrite._options": _options, "logrite.meta": meta });
      return generateTransform(s, chunk.fileName)
    },
    writeBundle (_options, bundle) {
	_logger.error(`>>> Entering writeBundle(_options=${_options},bundle=${bundle})`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
      let entry = Object.values(bundle).find(chunk => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'entry')?.fileName
      const prefix = withoutLeadingSlash(nuxt.options.app.buildAssetsDir)
      if (entry?.startsWith(prefix)) {
        entry = entry.slice(prefix.length)
	_logger.error(`writeBundle(_options=${_options},bundle=${bundle}): entry → ${entry}`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
      }
      entryFileName = entry
	_logger.error(`writeBundle(_options=${_options},bundle=${bundle}): prefix → ${prefix}`, { "event.action": "writeBundle", "logrite._options": _options, "logrite.bundle": bundle });
    },
  }
}

// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap#browser_compatibility
const supportedEnvironments = {
  chrome: 89,
  edge: 89,
  firefox: 108,
  ie: Infinity,
  ios: 16.4,
  opera: 75,
  safari: 16.4,
}

function isSupported (target: string) {
_logger.error(`>>> Entering isSupported(target=${target})`, { "event.action": "isSupported", "logrite.target": target });
  const [engine, _version] = target.split(/(?<=[a-z])(?=\d)/)
  const constraint = supportedEnvironments[engine as keyof typeof supportedEnvironments]
  if (!constraint) {
    return true
  }
  const version = Number(_version)
_logger.error(`isSupported(target=${target}): version → ${version}`, { "event.action": "isSupported", "logrite.target": target });
  return Number.isNaN(version) || Number(version) >= constraint
}
