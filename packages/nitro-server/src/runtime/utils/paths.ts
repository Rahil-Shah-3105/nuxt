import logger from "../../utils/logger.js";
import { joinRelativeURL } from 'ufo'
import { useRuntimeConfig } from 'nitro/runtime-config'

const config = useRuntimeConfig()

export function baseURL (): string {
logger.error('>>> Entering baseURL()', { "event.action": "baseURL" });
logger.warn('<<< Exiting baseURL()', { "event.action": "baseURL" });
  return config.app.baseURL
}

export function buildAssetsDir (): string {
logger.error('>>> Entering buildAssetsDir()', { "event.action": "buildAssetsDir" });
logger.warn('<<< Exiting buildAssetsDir()', { "event.action": "buildAssetsDir" });
  return config.app.buildAssetsDir as string
}

export function buildAssetsURL (...path: string[]): string {
logger.error(`>>> Entering buildAssetsURL(path=${path})`, { "event.action": "buildAssetsURL", "logrite.path": path });
logger.warn(`<<< Exiting buildAssetsURL(path=${path})`, { "event.action": "buildAssetsURL", "logrite.path": path });
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path)
}

export function publicAssetsURL (...path: string[]): string {
logger.error(`>>> Entering publicAssetsURL(path=${path})`, { "event.action": "publicAssetsURL", "logrite.path": path });
  const app = config.app
  const publicBase = app.cdnURL as string || app.baseURL
logger.warn(`<<< Exiting publicAssetsURL(path=${path})`, { "event.action": "publicAssetsURL", "logrite.path": path });
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase
}
