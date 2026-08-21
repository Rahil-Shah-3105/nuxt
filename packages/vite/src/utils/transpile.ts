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
  const nuxt = useNuxt()
  const transpile: RegExp[] = []
_logger.debug(`getTranspilePatterns(envs=${envs}): nuxt → ${nuxt}`);

  for (let pattern of nuxt.options.build.transpile) {
	_logger.debug(`>>> Entering getTranspilePatterns(envs=${envs})`);
    if (typeof pattern === 'function') {
      const result = pattern(envs)
      if (result) { pattern = result }
	_logger.debug(`getTranspilePatterns(envs=${envs}): result → ${result}`);
    }
    if (typeof pattern === 'string') {
      transpile.push(new RegExp(escapeRegExp(normalize(pattern))))
    } else if (pattern instanceof RegExp) {
      transpile.push(pattern)
	_logger.debug(`<<< Exiting getTranspilePatterns(envs=${envs})`);
    }
  }

  return transpile
}

/**
 * Get transpile patterns as strings for use with Vite's optimizeDeps.exclude
 * This resolves functions and filters to only string patterns
 */
export function getTranspileStrings (envs: Envs): string[] {
  const nuxt = useNuxt()
  const patterns: string[] = []
_logger.debug(`getTranspileStrings(envs=${envs}): nuxt → ${nuxt}`);

  for (let pattern of nuxt.options.build.transpile) {
	_logger.debug(`>>> Entering getTranspileStrings(envs=${envs})`);
    if (typeof pattern === 'function') {
      const result = pattern(envs)
      if (result) { pattern = result }
	_logger.debug(`getTranspileStrings(envs=${envs}): result → ${result}`);
    }
    if (typeof pattern === 'string') {
      patterns.push(normalize(pattern))
	_logger.debug(`<<< Exiting getTranspileStrings(envs=${envs})`);
    }
  }

  return patterns
}
