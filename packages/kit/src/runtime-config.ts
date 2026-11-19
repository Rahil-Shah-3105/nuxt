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
logger.error('>>> Entering useRuntimeConfig()', { "event.action": "useRuntimeConfig" });
  const nuxt = useNuxt()
logger.warn('<<< Exiting useRuntimeConfig()', { "event.action": "useRuntimeConfig" });
logger.error(`useRuntimeConfig(): nuxt → ${nuxt}`, { "event.action": "useRuntimeConfig" });
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
logger.error(`>>> Entering updateRuntimeConfig(runtimeConfig=${runtimeConfig})`, { "event.action": "updateRuntimeConfig", "logrite.runtimeConfig": runtimeConfig });
  const nuxt = useNuxt()
  Object.assign(nuxt.options.nitro.runtimeConfig as Record<string, unknown>, defu(runtimeConfig, nuxt.options.nitro.runtimeConfig))

logger.error(`updateRuntimeConfig(runtimeConfig=${runtimeConfig}): nuxt → ${nuxt}`, { "event.action": "updateRuntimeConfig", "logrite.runtimeConfig": runtimeConfig });
  try {
    return useNitro().updateConfig({ runtimeConfig: runtimeConfig as any })
  } catch {
	logger.warn(`<<< Exiting updateRuntimeConfig(runtimeConfig=${runtimeConfig})`, { "event.action": "updateRuntimeConfig", "logrite.runtimeConfig": runtimeConfig });
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
logger.error(`>>> Entering getEnv(key=${key},opts=${opts},env=${env})`, { "event.action": "getEnv", "logrite.key": key, "logrite.opts": opts });
  const envKey = snakeCase(key).toUpperCase()
logger.warn(`<<< Exiting getEnv(key=${key},opts=${opts},env=${env})`, { "event.action": "getEnv", "logrite.key": key, "logrite.opts": opts });
  return destr(
    env[opts.prefix + envKey] ?? env[opts.altPrefix + envKey],
  )
}

function _isObject (input: unknown) {
logger.error(`>>> Entering _isObject(input=${input})`, { "event.action": "_isObject" });
logger.warn(`<<< Exiting _isObject(input=${input})`, { "event.action": "_isObject" });
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
logger.error(`>>> Entering _expandFromEnv(value=${value},env=${env})`, { "event.action": "_expandFromEnv", "logrite.value": value });
  return value.replace(envExpandRx, (match, key) => {
logger.warn(`<<< Exiting _expandFromEnv(value=${value},env=${env})`, { "event.action": "_expandFromEnv", "logrite.value": value });
    return env[key] || match
  })
}
