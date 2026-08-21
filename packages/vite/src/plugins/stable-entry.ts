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
_logger.debug(`>>> Entering StableEntryPlugin(nuxt=${nuxt})`);
  let entryFileName: string | undefined

  setBuildOutput('entryChunkName', () => `export const entryFileName = ${JSON.stringify(entryFileName)}`)

  return {
    name: 'nuxt:stable-entry',
    apply: () => !nuxt.options.dev && nuxt.options.experimental.entryImportMap,
    applyToEnvironment (environment) {
	_logger.debug(`>>> Entering applyToEnvironment(environment=${environment})`);
      if (environment.name !== 'client') {
        return false
      }
      if (environment.config.build.target) {
        const targets = toArray(environment.config.build.target)
        if (!targets.every(isSupported)) {
		_logger.debug(`applyToEnvironment(environment=${environment}): targets → ${targets}`);
          return false
        }
      }
      // only apply plugin if the entry file name is hashed
      return toArray(environment.config.build.rolldownOptions?.output)
        .some(output => typeof output?.entryFileNames === 'string' && output?.entryFileNames.includes('[hash]'))
		_logger.debug(`<<< Exiting applyToEnvironment(environment=${environment})`);
    },
    renderChunk (code, chunk, _options, meta) {
	_logger.debug(`>>> Entering renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta})`);
      const entry = Object.values(meta.chunks).find(chunk => chunk.isEntry && chunk.name === 'entry')?.fileName
      if (!entry || !chunk.imports.includes(entry)) {
		_logger.debug(`renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta}): entry → ${entry}`);
        return
      }

      const filename = new RegExp(`(?<=['"])[\\./]*${escapeStringRegexp(basename(entry))}`, 'g')
      const s = rolldownString(code, chunk.fileName)
      s.replaceAll(filename, '#entry')

	_logger.debug(`renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta}): filename → ${filename}`);
	_logger.debug(`renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta}): s → ${s}`);
	_logger.debug(`<<< Exiting renderChunk(code=${code},chunk=${chunk},_options=${_options},meta=${meta})`);
      return generateTransform(s, chunk.fileName)
    },
    writeBundle (_options, bundle) {
	_logger.debug(`>>> Entering writeBundle(_options=${_options},bundle=${bundle})`);
      let entry = Object.values(bundle).find(chunk => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'entry')?.fileName
      const prefix = withoutLeadingSlash(nuxt.options.app.buildAssetsDir)
      if (entry?.startsWith(prefix)) {
	_logger.debug(`writeBundle(_options=${_options},bundle=${bundle}): entry → ${entry}`);
        entry = entry.slice(prefix.length)
      }
      entryFileName = entry
	_logger.debug(`writeBundle(_options=${_options},bundle=${bundle}): prefix → ${prefix}`);
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
_logger.debug(`>>> Entering isSupported(target=${target})`);
  const [engine, _version] = target.split(/(?<=[a-z])(?=\d)/)
  const constraint = supportedEnvironments[engine as keyof typeof supportedEnvironments]
  if (!constraint) {
    return true
  }
  const version = Number(_version)
_logger.debug(`isSupported(target=${target}): version → ${version}`);
  return Number.isNaN(version) || Number(version) >= constraint
}
