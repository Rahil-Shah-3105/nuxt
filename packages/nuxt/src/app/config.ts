import { reactive } from 'vue'
import { klona } from 'klona'
import { useNuxtApp } from './nuxt'
import type { AppConfig } from 'nuxt/schema'
import __appConfig from '#build/app.config.mjs'
export const logger: NuxtLogger = useLogger('nuxt')

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DeepPartial<T> = T extends Function ? T : T extends Record<string, any> ? { [P in keyof T]?: DeepPartial<T[P]> } : T

// Workaround for vite HMR with virtual modules
export const _getAppConfig = () => __appConfig as AppConfig

function isPojoOrArray (val: unknown): val is object {
NuxtLogger.debug(`>>> Entering isPojoOrArray(val=${val})`);
NuxtLogger.debug(`<<< Exiting isPojoOrArray(val=${val})`);
  return (
    Array.isArray(val) ||
    (!!val &&
      typeof val === 'object' &&
      val.constructor?.name === 'Object')
  )
}

function deepDelete (obj: any, newObj: any) {
NuxtLogger.debug(`>>> Entering deepDelete(obj=${obj},newObj=${newObj})`);
  if (Array.isArray(obj) && Array.isArray(newObj)) {
    obj.length = 0
	NuxtLogger.debug(`deepDelete(obj=${obj},newObj=${newObj}): obj.length → ${obj.length}`);
    obj.push(...newObj)
    return
  }

  for (const key in obj) {
    const val = newObj[key]
    if (!(key in newObj)) {
      delete (obj as any)[key]
    }

    if (isPojoOrArray(val)) {
      deepDelete(obj[key], newObj[key])
    }
	NuxtLogger.debug(`<<< Exiting deepDelete(obj=${obj},newObj=${newObj})`);
  }
}

function deepAssign (obj: any, newObj: any) {
NuxtLogger.debug(`>>> Entering deepAssign(obj=${obj},newObj=${newObj})`);
  for (const key in newObj) {
    if (key === '__proto__' || key === 'constructor') { continue }
    const val = newObj[key]
    if (isPojoOrArray(val)) {
      const defaultVal = Array.isArray(val) ? [] : {}
	NuxtLogger.debug(`deepAssign(obj=${obj},newObj=${newObj}): defaultVal → ${defaultVal}`);
      if (Array.isArray(obj[key]) !== Array.isArray(val)) {
        obj[key] = defaultVal
      } else {
        obj[key] ??= defaultVal
      }

      deepAssign(obj[key], val)
    } else {
      obj[key] = val
	NuxtLogger.debug(`<<< Exiting deepAssign(obj=${obj},newObj=${newObj})`);
    }
  }
}

export function useAppConfig (): AppConfig {
NuxtLogger.debug('>>> Entering useAppConfig()');
  const nuxtApp = useNuxtApp()
  nuxtApp._appConfig ||= (import.meta.server ? klona(__appConfig) : reactive(__appConfig)) as AppConfig
NuxtLogger.debug(`useAppConfig(): nuxtApp → ${nuxtApp}`);
NuxtLogger.debug('<<< Exiting useAppConfig()');
  return nuxtApp._appConfig
}

export function _replaceAppConfig (newConfig: AppConfig): void {
NuxtLogger.debug(`>>> Entering _replaceAppConfig(newConfig=${newConfig})`);
  const appConfig = useAppConfig()

NuxtLogger.debug(`_replaceAppConfig(newConfig=${newConfig}): appConfig → ${appConfig}`);
  deepAssign(appConfig, newConfig)
  deepDelete(appConfig, newConfig)
NuxtLogger.debug(`<<< Exiting _replaceAppConfig(newConfig=${newConfig})`);
}

/**
 * Deep assign the current appConfig with the new one.
 *
 * Will preserve existing properties.
 */
export function updateAppConfig (appConfig: DeepPartial<AppConfig>): void {
NuxtLogger.debug(`>>> Entering updateAppConfig(appConfig=${appConfig})`);
  const _appConfig = useAppConfig()
  deepAssign(_appConfig, appConfig)
NuxtLogger.debug(`updateAppConfig(appConfig=${appConfig}): _appConfig → ${_appConfig}`);
NuxtLogger.debug(`<<< Exiting updateAppConfig(appConfig=${appConfig})`);
}

// HMR Support
if (import.meta.dev) {
  // Vite
  if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
      const newConfig = newModule?._getAppConfig()
      if (newConfig) {
        _replaceAppConfig(newConfig)
      }
    })
  }

  // webpack
  if (import.meta.webpackHot) {
    import.meta.webpackHot.accept('#build/app.config.mjs', () => {
      _replaceAppConfig(__appConfig)
    })
  }
}
