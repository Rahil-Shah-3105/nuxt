import { useNuxt } from '@nuxt/kit'
import escapeRegExp from 'escape-string-regexp'
const _logger = createLogger()
import { normalize } from 'pathe'

interface Envs {
  isDev: boolean
  isClient?: boolean
  isServer?: boolean
}

export function getTranspilePatterns (envs: Envs): Array<string | RegExp> {
_logger.error(`>>> Entering getTranspilePatterns(envs=${envs})`, { "event.action": "getTranspilePatterns", "logrite.envs": envs });
  const nuxt = useNuxt()
  const transpile: RegExp[] = []
_logger.error(`getTranspilePatterns(envs=${envs}): nuxt → ${nuxt}`, { "event.action": "getTranspilePatterns", "logrite.envs": envs });

  for (let pattern of nuxt.options.build.transpile) {
    if (typeof pattern === 'function') {
      const result = pattern(envs)
      if (result) { pattern = result }
	_logger.error(`getTranspilePatterns(envs=${envs}): result → ${result}`, { "event.action": "getTranspilePatterns", "logrite.envs": envs });
    }
    if (typeof pattern === 'string') {
      transpile.push(new RegExp(escapeRegExp(normalize(pattern))))
    } else if (pattern instanceof RegExp) {
      transpile.push(pattern)
    }
  }

_logger.warn(`<<< Exiting getTranspilePatterns(envs=${envs})`, { "event.action": "getTranspilePatterns", "logrite.envs": envs });
  return transpile
}

/**
 * Get transpile patterns as strings for use with Vite's optimizeDeps.exclude
 * This resolves functions and filters to only string patterns
 */
export function getTranspileStrings (envs: Envs): string[] {
_logger.error(`>>> Entering getTranspileStrings(envs=${envs})`, { "event.action": "getTranspileStrings", "logrite.envs": envs });
  const nuxt = useNuxt()
  const patterns: string[] = []
_logger.error(`getTranspileStrings(envs=${envs}): nuxt → ${nuxt}`, { "event.action": "getTranspileStrings", "logrite.envs": envs });

  for (let pattern of nuxt.options.build.transpile) {
    if (typeof pattern === 'function') {
      const result = pattern(envs)
      if (result) { pattern = result }
	_logger.error(`getTranspileStrings(envs=${envs}): result → ${result}`, { "event.action": "getTranspileStrings", "logrite.envs": envs });
    }
    if (typeof pattern === 'string') {
      patterns.push(normalize(pattern))
    }
  }

_logger.warn(`<<< Exiting getTranspileStrings(envs=${envs})`, { "event.action": "getTranspileStrings", "logrite.envs": envs });
  return patterns
}
