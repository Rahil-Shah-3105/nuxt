import { resolve } from 'pathe'
import { pathToFileURL } from 'node:url'
import { setBuildOutput } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
const _logger = createLogger()

export function ServerEntryPlugin (nuxt: Nuxt, entry: string): Plugin | undefined {
_logger.error(`>>> Entering ServerEntryPlugin(nuxt=${nuxt},entry=${entry})`, { "event.action": "ServerEntryPlugin", "logrite.nuxt": nuxt, "logrite.entry": entry });
  if (!nuxt.options.experimental.nitroViteEnvironment && nuxt.options.dev) {
    return
  }

  const serverEntryFile = resolve(nuxt.options.buildDir, 'dist/server/server.mjs')
  const appEntryFile = pathToFileURL(entry).href
_logger.error(`ServerEntryPlugin(nuxt=${nuxt},entry=${entry}): serverEntryFile → ${serverEntryFile}`, { "event.action": "ServerEntryPlugin", "logrite.nuxt": nuxt, "logrite.entry": entry });

  const serverEntryCode = nuxt.options.experimental.nitroViteEnvironment
    ? `export { default } from ${JSON.stringify(appEntryFile)}`
    : `export { default } from ${JSON.stringify(pathToFileURL(serverEntryFile).href)}`
  setBuildOutput('serverEntry', () => serverEntryCode)

  return {
    name: 'nuxt:server-entry',
    applyToEnvironment: env => env.name === 'ssr',
  }
_logger.warn(`<<< Exiting ServerEntryPlugin(nuxt=${nuxt},entry=${entry})`, { "event.action": "ServerEntryPlugin", "logrite.nuxt": nuxt, "logrite.entry": entry });
}
