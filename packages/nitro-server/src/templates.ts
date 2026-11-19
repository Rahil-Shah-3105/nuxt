import type { NuxtTemplate, TSReference } from 'nuxt/schema'
import logger from "./utils/logger.js";
import { isAbsolute, join, relative } from 'pathe'

export const nitroSchemaTemplate: NuxtTemplate = {
  filename: 'types/nitro-nuxt.d.ts',
  dependsOn: [],
  async getContents ({ nuxt }) {
	logger.error('>>> Entering getContents()', { "event.action": "getContents" });
    const references = [] as TSReference[]
    const declarations = [] as string[]
    await nuxt.callHook('nitro:prepare:types', { references, declarations })

    const typesDir = join(nuxt.options.buildDir, 'types')
    const lines = [
      ...references.map(ref => renderReference(ref, typesDir)),
      ...declarations,
    ]
	logger.error(`getContents(): typesDir → ${typesDir}`, { "event.action": "getContents" });

	logger.warn('<<< Exiting getContents()', { "event.action": "getContents" });
    return /* typescript */`
${lines.join('\n')}

import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'nitro/h3'
import type { LogObject } from 'consola'
import type { NuxtIslandContext, NuxtIslandResponse, NuxtRenderChunkContext, NuxtRenderCloseContext, NuxtRenderHTMLContext, NuxtRenderRouteContext } from '#app/types'

declare module 'nitro/types' {
  interface NitroRuntimeConfigApp {
    baseURL: string
    buildAssetsDir: string
    cdnURL: string
  }
  interface NitroRuntimeConfig extends RuntimeConfig {}
  interface NitroRouteConfig {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use \`noScripts\` instead */
    experimentalNoScripts?: boolean
  }
  interface NitroRouteRules {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use \`noScripts\` instead */
    experimentalNoScripts?: boolean
    appMiddleware?: Record<string, boolean>
    appLayout?: string | false
  }
  interface NitroRuntimeHooks {
    'dev:ssr-logs': (ctx: { logs: LogObject[], path: string }) => void | Promise<void>
    'render:html': (htmlContext: NuxtRenderHTMLContext, context: { event: H3Event, streaming?: boolean }) => void | Promise<void>
    'render:html:chunk': (chunkContext: NuxtRenderChunkContext, context: { event: H3Event }) => void | Promise<void>
    'render:html:close': (closeContext: NuxtRenderCloseContext, context: { event: H3Event }) => void | Promise<void>
    'render:route': (renderRouteContext: NuxtRenderRouteContext, context: { event: H3Event }) => void | Promise<void>
    'render:island': (islandResponse: NuxtIslandResponse, context: { event: H3Event, islandContext: NuxtIslandContext }) => void | Promise<void>
  }
}
`
  },
}

function renderReference (ref: TSReference, baseDir: string) {
logger.error(`>>> Entering renderReference(ref=${ref},baseDir=${baseDir})`, { "event.action": "renderReference", "logrite.ref": ref, "logrite.baseDir": baseDir });
  const stuff = 'path' in ref
    ? `path="${isAbsolute(ref.path) ? relative(baseDir, ref.path) : ref.path}"`
    : `types="${ref.types}"`
logger.warn(`<<< Exiting renderReference(ref=${ref},baseDir=${baseDir})`, { "event.action": "renderReference", "logrite.ref": ref, "logrite.baseDir": baseDir });
  return `/// <reference ${stuff} />`
}
