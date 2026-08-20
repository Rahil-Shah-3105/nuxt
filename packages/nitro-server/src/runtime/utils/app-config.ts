import type { H3Event } from 'nitro/h3'
import { klona } from 'klona'
import type { AppConfig } from '@nuxt/schema'

import '../context'
import _inlineAppConfig from '#internal/nuxt/app-config'
import logger from "../../utils/logger.js";

// App config
const _sharedAppConfig = _deepFreeze(klona(_inlineAppConfig)) as AppConfig
export function useAppConfig (event?: H3Event): AppConfig {
  // Backwards compatibility with ambient context
  if (!event) {
	logger.debug(`>>> Entering useAppConfig(event=${event})`);
	logger.debug(`<<< Exiting useAppConfig(event=${event})`);
    return _sharedAppConfig
  }
  event.context.nuxt ||= {}
  // Reuse cached app config from event context
  if (event.context.nuxt.appConfig) {
    return event.context.nuxt.appConfig
  }
  // Prepare app config for event context
  const appConfig = klona(_inlineAppConfig)
  event.context.nuxt.appConfig = appConfig
logger.debug(`useAppConfig(event=${event}): appConfig → ${appConfig}`);
  return appConfig
}

// --- Utils ---

function _deepFreeze (object: Record<string, any>) {
logger.debug(`>>> Entering _deepFreeze(object=${object})`);
  const propNames = Object.getOwnPropertyNames(object)
  for (const name of propNames) {
    const value = object[name]
    if (value && typeof value === 'object') {
      _deepFreeze(value)
    }
  }
logger.debug(`<<< Exiting _deepFreeze(object=${object})`);
  return Object.freeze(object)
}
