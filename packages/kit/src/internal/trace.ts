import logger from "../utils/logger.js";
import { captureStackTrace } from 'errx'

const distURL = import.meta.url.replace(/\/dist\/.*$/, '/')

export function getUserCaller () {
logger.debug('>>> Entering getUserCaller()');
  if (!import.meta.dev) {
    return null
  }

  const { source, line, column } = captureStackTrace().find(entry => !entry.source.startsWith(distURL)) ?? {}

  if (!source) {
    return null
  }

  return {
    source: source.replace(/^file:\/\//, ''),
    line,
    column,
  }
logger.debug('<<< Exiting getUserCaller()');
}

const warnings = new Set<string>()

export function warn (warning: string) {
logger.debug(`>>> Entering warn(warning=${warning})`);
  if (!warnings.has(warning)) {
    console.warn(warning)
    warnings.add(warning)
  }
	logger.debug(`<<< Exiting warn(warning=${warning})`);
}
