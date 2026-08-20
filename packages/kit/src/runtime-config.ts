import process from 'node:process'
import destr from 'destr'
import logger from "./utils/logger.js";
import { snakeCase } from 'scule'
import { klona } from 'klona'

import { defu } from 'defu'
import { useNuxt } from './context.ts'
import { useNitro } from './nitro.ts'

/**
 * Access 'resolved' Nuxt runtime configuration, with values updated from environment.
 *
 * This mirrors the runtime behavior of Nitro.
 */
export function useRuntimeConfig (): Record<string, any> {
logger.debug('>>> Entering useRuntimeConfig()');
  const nuxt = useNuxt()
logger.debug('<<< Exiting useRuntimeConfig()');
  return applyEnv(klona(nuxt.options.nitro.runtimeConfig!), {
    prefix: 'NITRO_',
    altPrefix: 'NUXT_',
    envExpansion: nuxt.options.nitro.experimental?.envExpansion ?? !!process.env.NITRO_ENV_EXPANSION,
  })
}

/**
 * Update Nuxt runtime configuration.
 */
export function updateRuntimeConfig (runtimeConfig: Record<string, unknown>): void | Promise<void> {
logger.debug(`>>> Entering updateRuntimeConfig(runtimeConfig=${runtimeConfig})`);
  const nuxt = useNuxt()
  Object.assign(nuxt.options.nitro.runtimeConfig as Record<string, unknown>, defu(runtimeConfig, nuxt.options.nitro.runtimeConfig))

logger.debug(`updateRuntimeConfig(runtimeConfig=${runtimeConfig}): nuxt → ${nuxt}`);
  try {
    return useNitro().updateConfig({ runtimeConfig: runtimeConfig as any })
  } catch {
	logger.debug(`<<< Exiting updateRuntimeConfig(runtimeConfig=${runtimeConfig})`);
    // Nitro is not yet initialised - we can safely ignore this error
  }
}

/**
 * https://github.com/nitrojs/nitro/blob/v2/src/runtime/internal/utils.env.ts.
*
 * These utils will be replaced by util exposed from nitropack. See https://github.com/nitrojs/nitro/pull/2404
 * for more context and future plans.)
 *
 * @internal
 */

type EnvOptions = {
  prefix?: string
  altPrefix?: string
  envExpansion?: boolean
}

function getEnv (key: string, opts: EnvOptions, env = process.env) {
logger.debug(`>>> Entering getEnv(key=${key},opts=${opts},env=${env})`);
  const envKey = snakeCase(key).toUpperCase()
logger.debug(`<<< Exiting getEnv(key=${key},opts=${opts},env=${env})`);
  return destr(
    env[opts.prefix + envKey] ?? env[opts.altPrefix + envKey],
  )
}

function _isObject (input: unknown) {
logger.debug(`>>> Entering _isObject(input=${input})`);
logger.debug(`<<< Exiting _isObject(input=${input})`);
  return typeof input === 'object' && !Array.isArray(input)
}

function applyEnv (
  obj: Record<string, any>,
  opts: EnvOptions,
  parentKey = '',
) {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key
    const envValue = getEnv(subKey, opts)
    if (_isObject(obj[key])) {
      // Same as before
      if (_isObject(envValue)) {
        obj[key] = { ...(obj[key] as any), ...(envValue as any) }
        applyEnv(obj[key], opts, subKey)
      } else if (envValue === undefined) {
        // If envValue is undefined
        // Then proceed to nested properties
        applyEnv(obj[key], opts, subKey)
      } else {
        // If envValue is a primitive other than undefined
        // Then set objValue and ignore the nested properties
        obj[key] = envValue ?? obj[key]
      }
    } else {
      obj[key] = envValue ?? obj[key]
    }
    // Experimental env expansion
    if (opts.envExpansion && typeof obj[key] === 'string') {
      obj[key] = _expandFromEnv(obj[key])
    }
  }
  return obj
}

const envExpandRx = /\{\{([^{}]*)\}\}/g

function _expandFromEnv (value: string, env: Record<string, any> = process.env) {
logger.debug(`>>> Entering _expandFromEnv(value=${value},env=${env})`);
logger.debug(`<<< Exiting _expandFromEnv(value=${value},env=${env})`);
  return value.replace(envExpandRx, (match, key) => {
    return env[key] || match
  })
}
