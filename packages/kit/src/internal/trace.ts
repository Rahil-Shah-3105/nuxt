import logger from "../utils/logger.js";
import { captureStackTrace } from 'errx'

const distURL = import.meta.url.replace(/\/dist\/.*$/, '/')

export function getUserCaller () {
logger.error('>>> Entering getUserCaller()', { "event.action": "getUserCaller" });
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
logger.warn('<<< Exiting getUserCaller()', { "event.action": "getUserCaller" });
}

const warnings = new Set<string>()

export function warn (warning: string) {
logger.error(`>>> Entering warn(warning=${warning})`, { "event.action": "warn", "logrite.warning": warning });
  if (!warnings.has(warning)) {
    console.warn(warning)
    warnings.add(warning)
  }
	logger.warn(`<<< Exiting warn(warning=${warning})`, { "event.action": "warn", "logrite.warning": warning });
}
