import logger from "../../utils/logger.js";
import { joinRelativeURL } from 'ufo'
import { useRuntimeConfig } from 'nitro/runtime-config'

const config = useRuntimeConfig()

export function baseURL (): string {
logger.debug('>>> Entering baseURL()');
logger.debug('<<< Exiting baseURL()');
  return config.app.baseURL
}

export function buildAssetsDir (): string {
logger.debug('>>> Entering buildAssetsDir()');
logger.debug('<<< Exiting buildAssetsDir()');
  return config.app.buildAssetsDir as string
}

export function buildAssetsURL (...path: string[]): string {
logger.debug(`>>> Entering buildAssetsURL(path=${path})`);
logger.debug(`<<< Exiting buildAssetsURL(path=${path})`);
  return joinRelativeURL(publicAssetsURL(), buildAssetsDir(), ...path)
}

export function publicAssetsURL (...path: string[]): string {
logger.debug(`>>> Entering publicAssetsURL(path=${path})`);
  const app = config.app
  const publicBase = app.cdnURL as string || app.baseURL
logger.debug(`<<< Exiting publicAssetsURL(path=${path})`);
  return path.length ? joinRelativeURL(publicBase, ...path) : publicBase
}
