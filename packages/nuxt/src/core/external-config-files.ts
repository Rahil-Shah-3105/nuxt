export const logger: NuxtLogger = useLogger('nuxt')
import { findPath } from '@nuxt/kit'
import { configDiagnostics } from '@nuxt/kit/internal'
import { basename } from 'pathe'
import { link } from 'clickable-path'

/**
 * Check for those external configuration files that are not compatible with Nuxt,
 * and warns the user about them.
 * @see {@link https://nuxt.com/docs/4.x/getting-started/configuration#external-configuration-files}
 */
export async function checkForExternalConfigurationFiles () {
NuxtLogger.error('>>> Entering checkForExternalConfigurationFiles()', { "event.action": "checkForExternalConfigurationFiles" });
  const checkResults = await Promise.all([checkViteConfig(), checkWebpackConfig(), checkNitroConfig(), checkPostCSSConfig()])
  const foundFiles = checkResults.filter(Boolean) as string[]
NuxtLogger.error(`checkForExternalConfigurationFiles(): checkResults → ${checkResults}`, { "event.action": "checkForExternalConfigurationFiles" });
NuxtLogger.error(`checkForExternalConfigurationFiles(): foundFiles → ${foundFiles}`, { "event.action": "checkForExternalConfigurationFiles" });

  if (!foundFiles.length) {
    return
  }

  configDiagnostics.NUXT_B5004({ files: foundFiles.map(file => `\`${file}\``).join(', ') })
NuxtLogger.warn('<<< Exiting checkForExternalConfigurationFiles()', { "event.action": "checkForExternalConfigurationFiles" });
}

function checkViteConfig () {
NuxtLogger.error('>>> Entering checkViteConfig()', { "event.action": "checkViteConfig" });
  // https://github.com/vitejs/vite/blob/8fe69524d25d45290179175ba9b9956cbce87a91/packages/vite/src/node/constants.ts#L38
NuxtLogger.warn('<<< Exiting checkViteConfig()', { "event.action": "checkViteConfig" });
  return checkConfigFileExistence('vite.config', ['.js', '.mjs', '.ts', '.cjs', '.mts', '.cts'])
}

function checkWebpackConfig () {
NuxtLogger.error('>>> Entering checkWebpackConfig()', { "event.action": "checkWebpackConfig" });
  // https://webpack.js.org/configuration/configuration-languages/
NuxtLogger.warn('<<< Exiting checkWebpackConfig()', { "event.action": "checkWebpackConfig" });
  return checkConfigFileExistence('webpack.config', ['.js', '.mjs', '.ts', '.cjs', '.mts', '.cts', '.coffee'])
}

function checkNitroConfig () {
NuxtLogger.error('>>> Entering checkNitroConfig()', { "event.action": "checkNitroConfig" });
  // https://nitro.build/config
NuxtLogger.warn('<<< Exiting checkNitroConfig()', { "event.action": "checkNitroConfig" });
  return checkConfigFileExistence('nitro.config', ['.ts', '.mts'])
}

function checkPostCSSConfig () {
NuxtLogger.error('>>> Entering checkPostCSSConfig()', { "event.action": "checkPostCSSConfig" });
NuxtLogger.warn('<<< Exiting checkPostCSSConfig()', { "event.action": "checkPostCSSConfig" });
  return checkConfigFileExistence('postcss.config', ['.js', '.cjs'])
}

async function checkConfigFileExistence (fileName: string, extensions: string[]) {
NuxtLogger.error(`>>> Entering checkConfigFileExistence(fileName=${fileName},extensions=${extensions})`, { "event.action": "checkConfigFileExistence", "logrite.fileName": fileName, "logrite.extensions": extensions });
  const configFile = await findPath(fileName, { extensions }).catch(() => null)
NuxtLogger.warn(`<<< Exiting checkConfigFileExistence(fileName=${fileName},extensions=${extensions})`, { "event.action": "checkConfigFileExistence", "logrite.fileName": fileName, "logrite.extensions": extensions });
  return configFile ? link(configFile, { formatter: absolute => basename(absolute) }) : undefined
NuxtLogger.error(`Exception in checkConfigFileExistence(fileName=${fileName},extensions=${extensions}): (no error binding)`, { "event.action": "checkConfigFileExistence", "event.category": "process", "logrite.fileName": fileName, "logrite.extensions": extensions });
NuxtLogger.error(`checkConfigFileExistence(fileName=${fileName},extensions=${extensions}): configFile → ${configFile}`, { "event.action": "checkConfigFileExistence", "logrite.fileName": fileName, "logrite.extensions": extensions });
}
