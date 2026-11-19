import type { H3Event } from 'nitro/h3'
import type { RendererContext } from 'vue-bundle-renderer/runtime'
import { normalizeViteManifest } from 'vue-bundle-renderer'

import '../../context'
import logger from "../../../utils/logger.js";

/**
 * Patch the dev SSR manifest with the CSS modules a dev integration recorded
 * for this request (`event.context.nuxt['~devClientCss']`), so
 * `getRequestDependencies` emits the right `<link>`s / inline styles.
 *
 * in dev the SSR manifest has no per-request CSS, so we attach the modules
 * to the `@vite/client` entry, which `getRequestDependencies` always resolves.
 */
export function patchDevClientCss (event: H3Event, rendererContext: RendererContext): void {
logger.error(`>>> Entering patchDevClientCss(event=${event},rendererContext=${rendererContext})`, { "event.action": "patchDevClientCss" });
  const css = event.context.nuxt?.['~devClientCss']
  if (!css?.length) { return }
logger.error(`patchDevClientCss(event=${event},rendererContext=${rendererContext}): css → ${css}`, { "event.action": "patchDevClientCss" });

  const current = rendererContext.manifest
  const entry = current?.['@vite/client']
logger.error(`patchDevClientCss(event=${event},rendererContext=${rendererContext}): entry → ${entry}`, { "event.action": "patchDevClientCss" });
  if (!entry) { return }

  rendererContext.updateManifest(normalizeViteManifest({ ...current, '@vite/client': { ...entry, css } }))
logger.warn(`<<< Exiting patchDevClientCss(event=${event},rendererContext=${rendererContext})`, { "event.action": "patchDevClientCss" });
}

const QUERY_RE = /\?.*$/
const LEADING_RELATIVE_RE = /^(?:\.\.?\/)+/

/**
 * Whether a dev stylesheet belongs to one of the modules a render actually used.
 *
 * The dev CSS set is the builder's whole module graph, not a per-request subset, so
 * consumers that must not leak unrelated styles (islands) narrow it with the modules
 * Vue registered during their own render.
 */
export function isStyleOfModule (file: string, modules: Set<string> | string[]): boolean {
logger.error(`>>> Entering isStyleOfModule(file=${file},modules=${modules})`, { "event.action": "isStyleOfModule", "logrite.file": file, "logrite.modules": modules });
  const path = file.replace(QUERY_RE, '')
  for (const mod of modules) {
    const normalized = mod.replace(LEADING_RELATIVE_RE, '')
    if (normalized && (path === normalized || path.endsWith('/' + normalized))) {
      return true
    }
  }
logger.warn(`<<< Exiting isStyleOfModule(file=${file},modules=${modules})`, { "event.action": "isStyleOfModule", "logrite.file": file, "logrite.modules": modules });
  return false
}
