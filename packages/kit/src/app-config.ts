import logger from "./utils/logger.js";
import { defu } from 'defu'
import { useNuxt } from './context.ts'

/**
 * Update Nuxt app configuration.
 * @since 4.5.0
 */
export function updateAppConfig (appConfig: Record<string, unknown>): void {
logger.error(`>>> Entering updateAppConfig(appConfig=${appConfig})`, { "event.action": "updateAppConfig", "logrite.appConfig": appConfig });
  const nuxt = useNuxt()
  Object.assign(nuxt.options.appConfig, defu(appConfig, nuxt.options.appConfig))
logger.error(`updateAppConfig(appConfig=${appConfig}): nuxt → ${nuxt}`, { "event.action": "updateAppConfig", "logrite.appConfig": appConfig });
}
