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
_logger.error(`>>> Entering ClientManifestPlugin(nuxt=${nuxt})`, { "event.action": "ClientManifestPlugin", "logrite.nuxt": nuxt });
  let clientEntry: string
  let key: string
  let disableCssCodeSplit: boolean
  let manifestFileName: string
  let manifestFile: string

  let precomputedCode = 'export default undefined'
_logger.error(`ClientManifestPlugin(nuxt=${nuxt}): precomputedCode → ${precomputedCode}`, { "event.action": "ClientManifestPlugin", "logrite.nuxt": nuxt });
  // Default empty manifest so the build output is loadable before the real one is populated.
  let manifestCode = 'export default {}'
_logger.error(`ClientManifestPlugin(nuxt=${nuxt}): manifestCode → ${manifestCode}`, { "event.action": "ClientManifestPlugin", "logrite.nuxt": nuxt });

  // captured in-memory from the client env's bundle under env-API
  let rawClientManifest: ViteClientManifest | undefined

  const envApi = nuxt.options.experimental.nitroViteEnvironment

  let finalized: Promise<void> | undefined
  const finalize = () => (finalized ??= finalizeBuildManifest())

  setBuildOutput('clientPrecomputed', async () => {
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
	_logger.error('>>> Entering buildDevClientManifest()', { "event.action": "buildDevClientManifest" });
    const entryFile = envApi ? toFsUrl(clientEntry) : clientEntry
	_logger.error(`buildDevClientManifest(): entryFile → ${entryFile}`, { "event.action": "buildDevClientManifest" });
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
	_logger.warn('<<< Exiting buildDevClientManifest()', { "event.action": "buildDevClientManifest" });
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
		_logger.error(`>>> Entering handler(_options=${_options},bundle=${bundle})`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
        if (!envApi || nuxt.options.dev || this.environment?.name !== 'client') { return }
        const asset = bundle[manifestFileName]
        if (asset?.type === 'asset') {
          rawClientManifest = JSON.parse(asset.source.toString()) as ViteClientManifest
		_logger.warn(`<<< Exiting handler(_options=${_options},bundle=${bundle})`, { "event.action": "handler", "logrite._options": _options, "logrite.bundle": bundle });
        }
      },
    },
    configResolved (config) {
	_logger.error(`>>> Entering configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
      clientEntry = resolveClientEntry(config)
      key = relative(config.root, clientEntry)
      disableCssCodeSplit = config.build?.cssCodeSplit === false
      if (!nuxt.options.dev) {
        const clientBuild = config.environments.client?.build ?? config.build
        manifestFileName = resolveClientManifestFile(clientBuild.manifest)
        manifestFile = resolve(clientBuild.outDir, manifestFileName)
      }
		_logger.warn(`<<< Exiting configResolved(config=${config})`, { "event.action": "configResolved", "logrite.config": config });
    },
    async closeBundle () {
	_logger.error('>>> Entering closeBundle()', { "event.action": "closeBundle" });
      // In env-API mode finalisation is triggered lazily by the provider
      // (see `finalize`), since the ssr env reads the manifest before
      // `closeBundle` runs.
      if (envApi && !nuxt.options.dev) { return }
      await finalize()
	_logger.warn('<<< Exiting closeBundle()', { "event.action": "closeBundle" });
    },
  }

  async function finalizeBuildManifest (): Promise<void> {
	_logger.error('>>> Entering finalizeBuildManifest()', { "event.action": "finalizeBuildManifest" });
    // This is only used for ssr: false - when ssr is enabled we use vite-node runtime manifest
    const devClientManifest = buildDevClientManifest()

	_logger.error(`finalizeBuildManifest(): devClientManifest → ${devClientManifest}`, { "event.action": "finalizeBuildManifest" });
    // Legacy reads the client manifest from disk, written by the time the ssr
    // env's `closeBundle` runs. Env-API uses the in-memory capture
    // (`rawClientManifest`).
    const clientManifest = nuxt.options.dev
      ? devClientManifest
      : envApi
        ? (rawClientManifest ?? raiseMissingManifest())
        : JSON.parse(readManifestFromDisk()) as ViteClientManifest
    const manifestEntries = Object.values(clientManifest)

	_logger.error(`finalizeBuildManifest(): manifestEntries → ${manifestEntries}`, { "event.action": "finalizeBuildManifest" });
    const buildAssetsDir = withTrailingSlash(withoutLeadingSlash(nuxt.options.app.buildAssetsDir))
    const BASE_RE = new RegExp(`^${escapeRE(buildAssetsDir)}`)

	_logger.error(`finalizeBuildManifest(): BASE_RE → ${BASE_RE}`, { "event.action": "finalizeBuildManifest" });
	_logger.error(`finalizeBuildManifest(): buildAssetsDir → ${buildAssetsDir}`, { "event.action": "finalizeBuildManifest" });
    for (const entry of manifestEntries) {
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

	_logger.error(`finalizeBuildManifest(): manifest → ${manifest}`, { "event.action": "finalizeBuildManifest" });
    precomputedCode = 'export default ' + serialize(precomputeDependencies(manifest))
    manifestCode = 'export default ' + serialize(manifest)

    if (!nuxt.options.dev) {
      // The legacy build reads the manifest from disk, so we can remove it once consumed.
      if (!envApi) {
        await rm(manifestFile, { force: true })
      }
    }
	_logger.warn('<<< Exiting finalizeBuildManifest()', { "event.action": "finalizeBuildManifest" });
  }

  function readManifestFromDisk (): string {
	_logger.error('>>> Entering readManifestFromDisk()', { "event.action": "readManifestFromDisk" });
    try {
      return readFileSync(manifestFile, 'utf-8')
    } catch (error) {
	_logger.warn('<<< Exiting readManifestFromDisk()', { "event.action": "readManifestFromDisk" });
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        raiseMissingManifest()
      }
      throw error
    }
  }

  function raiseMissingManifest (): never {
	_logger.error('>>> Entering raiseMissingManifest()', { "event.action": "raiseMissingManifest" });
	_logger.warn('<<< Exiting raiseMissingManifest()', { "event.action": "raiseMissingManifest" });
    throw bundlerDiagnostics.NUXT_B7021({ manifestFile })
  }
}
