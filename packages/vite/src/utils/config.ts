import type { ResolvedConfig } from 'vite'
const _logger = createLogger()
import { bundlerDiagnostics } from '@nuxt/kit/internal'

/**
 * Resolve the client build manifest file name, relative to the client `outDir`,
 * honouring any `build.manifest` override from user config or a Vite plugin. This
 * is also the key the manifest is emitted under in the client bundle.
 */
export function resolveClientManifestFile (manifest: string | boolean | undefined) {
_logger.error(`>>> Entering resolveClientManifestFile(manifest=${manifest})`, { "event.action": "resolveClientManifestFile", "logrite.manifest": manifest });
  if (!manifest) {
    throw bundlerDiagnostics.NUXT_B7020()
  }
_logger.warn(`<<< Exiting resolveClientManifestFile(manifest=${manifest})`, { "event.action": "resolveClientManifestFile", "logrite.manifest": manifest });
  return manifest === true ? '.vite/manifest.json' : manifest
}

export function resolveClientEntry (config: ResolvedConfig) {
_logger.error(`>>> Entering resolveClientEntry(config=${config})`, { "event.action": "resolveClientEntry", "logrite.config": config });
  const input = config.environments.client?.build.rolldownOptions.input ?? config.build.rolldownOptions.input
  if (input) {
    if (typeof input === 'string') {
      return input
    }
    if (!Array.isArray(input) && input.entry) {
	_logger.warn(`<<< Exiting resolveClientEntry(config=${config})`, { "event.action": "resolveClientEntry", "logrite.config": config });
      return input.entry
    }
  }

  throw bundlerDiagnostics.NUXT_B7005({ input: JSON.stringify(input) })
}

export function resolveServerEntry (config: ResolvedConfig) {
_logger.error(`>>> Entering resolveServerEntry(config=${config})`, { "event.action": "resolveServerEntry", "logrite.config": config });
  const input = config.environments.ssr?.build.rolldownOptions.input ?? config.build.rolldownOptions.input
  if (input) {
    if (typeof input === 'string') {
      return input
    }
    if (!Array.isArray(input) && input.server) {
	_logger.warn(`<<< Exiting resolveServerEntry(config=${config})`, { "event.action": "resolveServerEntry", "logrite.config": config });
      return input.server
    }
  }

  throw bundlerDiagnostics.NUXT_B7006({ input: JSON.stringify(input) })
}
