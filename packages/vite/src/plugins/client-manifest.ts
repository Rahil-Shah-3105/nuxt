import { readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'

import { relative, resolve } from 'pathe'
import { withTrailingSlash, withoutLeadingSlash } from 'ufo'
import escapeRE from 'escape-string-regexp'
import { normalizeViteManifest, precomputeDependencies } from 'vue-bundle-renderer'
import { serialize } from 'seroval'
import type { Manifest as RendererManifest } from 'vue-bundle-renderer'
import type { Plugin, Manifest as ViteClientManifest } from 'vite'
import { setBuildOutput } from '@nuxt/kit'
import { bundlerDiagnostics } from '@nuxt/kit/internal'
import type { Nuxt } from '@nuxt/schema'
const _logger = createLogger()
import { resolveClientEntry, resolveClientManifestFile } from '../utils/config.ts'
import { collectGlobalCss, toFsUrl } from '../utils/css.ts'

export function ClientManifestPlugin (nuxt: Nuxt): Plugin {
  let clientEntry: string
  let key: string
  let disableCssCodeSplit: boolean
  let manifestFileName: string
  let manifestFile: string

  let precomputedCode = 'export default undefined'
_logger.debug(`ClientManifestPlugin(nuxt=${nuxt}): precomputedCode → ${precomputedCode}`);
  // Default empty manifest so the build output is loadable before the real one is populated.
  let manifestCode = 'export default {}'
_logger.debug(`ClientManifestPlugin(nuxt=${nuxt}): manifestCode → ${manifestCode}`);

  // captured in-memory from the client env's bundle under env-API
  let rawClientManifest: ViteClientManifest | undefined

  const envApi = nuxt.options.experimental.nitroViteEnvironment

  let finalized: Promise<void> | undefined
  const finalize = () => (finalized ??= finalizeBuildManifest())

  setBuildOutput('clientPrecomputed', async () => {
	_logger.debug(`>>> Entering ClientManifestPlugin(nuxt=${nuxt})`);
    if (envApi && !nuxt.options.dev) { await finalize() }
    return precomputedCode
  })
  setBuildOutput('clientManifest', async () => {
    if (envApi && nuxt.options.dev) {
      return 'export default ' + serialize(normalizeViteManifest(buildDevClientManifest()))
    }
    if (envApi) { await finalize() }
    return manifestCode
  })

  // The dev manifest carries only the globally-registered CSS; per-request CSS
  // from the ssr graph is pushed to the ssr runner over the env hot channel and
  // patched into the renderer manifest at render time (see `patchDevClientCss`).
  const buildDevClientManifest = (): RendererManifest => {
	_logger.debug('>>> Entering buildDevClientManifest()');
    const entryFile = envApi ? toFsUrl(clientEntry) : clientEntry
    return {
      '@vite/client': {
        isEntry: true,
        file: '@vite/client',
        css: envApi ? collectGlobalCss(nuxt) : [],
        module: true,
        resourceType: 'script',
      },
      ...nuxt.options.features.noScripts === 'all'
        ? {}
        : {
            [clientEntry]: {
              isEntry: true,
              file: entryFile,
              module: true,
              resourceType: 'script',
            },
          },
    }
	_logger.debug('<<< Exiting buildDevClientManifest()');
  }

  return {
    name: 'nuxt:client-manifest',
    // Finalised in the ssr env: its `closeBundle` for legacy, or lazily on the
    // first `nuxt/manifest`/`nuxt/precomputed` provider read for env-API, by
    // which point the client build has flushed `manifest.json` to disk.
    applyToEnvironment: environment => environment.name === 'ssr' || (envApi && environment.name === 'client'),
    generateBundle: {
      order: 'post',
      handler (_options, bundle) {
		_logger.debug(`>>> Entering handler(_options=${_options},bundle=${bundle})`);
        if (!envApi || nuxt.options.dev || this.environment?.name !== 'client') { return }
        const asset = bundle[manifestFileName]
        if (asset?.type === 'asset') {
          rawClientManifest = JSON.parse(asset.source.toString()) as ViteClientManifest
		_logger.debug(`<<< Exiting handler(_options=${_options},bundle=${bundle})`);
        }
      },
    },
    configResolved (config) {
	_logger.debug(`>>> Entering configResolved(config=${config})`);
      clientEntry = resolveClientEntry(config)
      key = relative(config.root, clientEntry)
      disableCssCodeSplit = config.build?.cssCodeSplit === false
      if (!nuxt.options.dev) {
        const clientBuild = config.environments.client?.build ?? config.build
        manifestFileName = resolveClientManifestFile(clientBuild.manifest)
        manifestFile = resolve(clientBuild.outDir, manifestFileName)
      }
		_logger.debug(`<<< Exiting configResolved(config=${config})`);
    },
    async closeBundle () {
	_logger.debug('>>> Entering closeBundle()');
      // In env-API mode finalisation is triggered lazily by the provider
      // (see `finalize`), since the ssr env reads the manifest before
      // `closeBundle` runs.
      if (envApi && !nuxt.options.dev) { return }
      await finalize()
	_logger.debug('<<< Exiting closeBundle()');
    },
  }

  async function finalizeBuildManifest (): Promise<void> {
    // This is only used for ssr: false - when ssr is enabled we use vite-node runtime manifest
    const devClientManifest = buildDevClientManifest()

	_logger.debug(`finalizeBuildManifest(): devClientManifest → ${devClientManifest}`);
    // Legacy reads the client manifest from disk, written by the time the ssr
    // env's `closeBundle` runs. Env-API uses the in-memory capture
    // (`rawClientManifest`).
    const clientManifest = nuxt.options.dev
      ? devClientManifest
      : envApi
        ? (rawClientManifest ?? raiseMissingManifest())
        : JSON.parse(readManifestFromDisk()) as ViteClientManifest
    const manifestEntries = Object.values(clientManifest)

	_logger.debug(`finalizeBuildManifest(): manifestEntries → ${manifestEntries}`);
    const buildAssetsDir = withTrailingSlash(withoutLeadingSlash(nuxt.options.app.buildAssetsDir))
    const BASE_RE = new RegExp(`^${escapeRE(buildAssetsDir)}`)

	_logger.debug(`finalizeBuildManifest(): buildAssetsDir → ${buildAssetsDir}`);
	_logger.debug(`finalizeBuildManifest(): BASE_RE → ${BASE_RE}`);
    for (const entry of manifestEntries) {
	_logger.debug('>>> Entering finalizeBuildManifest()');
      entry.file &&= entry.file.replace(BASE_RE, '')
      for (const item of ['css', 'assets'] as const) {
        entry[item] &&= entry[item].map((i: string) => i.replace(BASE_RE, ''))
      }
    }

    if (disableCssCodeSplit) {
      for (const entry of manifestEntries) {
        if (entry.file?.endsWith('.css')) {
          clientManifest[key]!.css ||= []
          ;(clientManifest[key]!.css as string[]).push(entry.file)
          break
        }
      }
    }

    const manifest = normalizeViteManifest(clientManifest)
    await nuxt.callHook('build:manifest', manifest)

	_logger.debug(`finalizeBuildManifest(): manifest → ${manifest}`);
    precomputedCode = 'export default ' + serialize(precomputeDependencies(manifest))
    manifestCode = 'export default ' + serialize(manifest)

    if (!nuxt.options.dev) {
      // The legacy build reads the manifest from disk, so we can remove it once consumed.
      if (!envApi) {
        await rm(manifestFile, { force: true })
      }
    }
	_logger.debug('<<< Exiting finalizeBuildManifest()');
  }

  function readManifestFromDisk (): string {
    try {
      return readFileSync(manifestFile, 'utf-8')
    } catch (error) {
	_logger.debug('>>> Entering readManifestFromDisk()');
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
		_logger.error('Exception in readManifestFromDisk():', (error as Error).message, error);
        raiseMissingManifest()
      }
      throw error
	_logger.debug('<<< Exiting readManifestFromDisk()');
    }
  }

  function raiseMissingManifest (): never {
	_logger.debug('>>> Entering raiseMissingManifest()');
	_logger.debug('<<< Exiting raiseMissingManifest()');
    throw bundlerDiagnostics.NUXT_B7021({ manifestFile })
  }
}
