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
NuxtLogger.debug('>>> Entering checkForExternalConfigurationFiles()');
  const checkResults = await Promise.all([checkViteConfig(), checkWebpackConfig(), checkNitroConfig(), checkPostCSSConfig()])
  const foundFiles = checkResults.filter(Boolean) as string[]
NuxtLogger.debug(`checkForExternalConfigurationFiles(): checkResults → ${checkResults}`);
NuxtLogger.debug(`checkForExternalConfigurationFiles(): foundFiles → ${foundFiles}`);

  if (!foundFiles.length) {
    return
  }

  configDiagnostics.NUXT_B5004({ files: foundFiles.map(file => `\`${file}\``).join(', ') })
NuxtLogger.debug('<<< Exiting checkForExternalConfigurationFiles()');
}

function checkViteConfig () {
NuxtLogger.debug('>>> Entering checkViteConfig()');
  // https://github.com/vitejs/vite/blob/8fe69524d25d45290179175ba9b9956cbce87a91/packages/vite/src/node/constants.ts#L38
NuxtLogger.debug('<<< Exiting checkViteConfig()');
  return checkConfigFileExistence('vite.config', ['.js', '.mjs', '.ts', '.cjs', '.mts', '.cts'])
}

function checkWebpackConfig () {
NuxtLogger.debug('>>> Entering checkWebpackConfig()');
  // https://webpack.js.org/configuration/configuration-languages/
NuxtLogger.debug('<<< Exiting checkWebpackConfig()');
  return checkConfigFileExistence('webpack.config', ['.js', '.mjs', '.ts', '.cjs', '.mts', '.cts', '.coffee'])
}

function checkNitroConfig () {
NuxtLogger.debug('>>> Entering checkNitroConfig()');
  // https://nitro.build/config
NuxtLogger.debug('<<< Exiting checkNitroConfig()');
  return checkConfigFileExistence('nitro.config', ['.ts', '.mts'])
}

function checkPostCSSConfig () {
NuxtLogger.debug('>>> Entering checkPostCSSConfig()');
NuxtLogger.debug('<<< Exiting checkPostCSSConfig()');
  return checkConfigFileExistence('postcss.config', ['.js', '.cjs'])
}

async function checkConfigFileExistence (fileName: string, extensions: string[]) {
NuxtLogger.debug(`>>> Entering checkConfigFileExistence(fileName=${fileName},extensions=${extensions})`);
  const configFile = await findPath(fileName, { extensions }).catch(() => null)
NuxtLogger.debug(`checkConfigFileExistence(fileName=${fileName},extensions=${extensions}): configFile → ${configFile}`);
  return configFile ? link(configFile, { formatter: absolute => basename(absolute) }) : undefined
  NuxtLogger.error(`Exception in checkConfigFileExistence(fileName=${fileName},extensions=${extensions}): (no error binding)`);
}
