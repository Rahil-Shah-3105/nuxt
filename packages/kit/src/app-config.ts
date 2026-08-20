import logger from "./utils/logger.js";
import { defu } from 'defu'
import { useNuxt } from './context.ts'

/**
 * Update Nuxt app configuration.
 * @since 4.5.0
 */
export function updateAppConfig (appConfig: Record<string, unknown>): void {
logger.debug(`>>> Entering updateAppConfig(appConfig=${appConfig})`);
  const nuxt = useNuxt()
  Object.assign(nuxt.options.appConfig, defu(appConfig, nuxt.options.appConfig))
logger.debug(`updateAppConfig(appConfig=${appConfig}): nuxt → ${nuxt}`);
logger.debug(`<<< Exiting updateAppConfig(appConfig=${appConfig})`);
}
