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
NuxtLogger.error(`>>> Entering isPojoOrArray(val=${val})`, { "event.action": "isPojoOrArray", "logrite.val": val });
NuxtLogger.warn(`<<< Exiting isPojoOrArray(val=${val})`, { "event.action": "isPojoOrArray", "logrite.val": val });
  return (
    Array.isArray(val) ||
    (!!val &&
      typeof val === 'object' &&
      val.constructor?.name === 'Object')
  )
}

function deepDelete (obj: any, newObj: any) {
NuxtLogger.error(`>>> Entering deepDelete(obj=${obj},newObj=${newObj})`, { "event.action": "deepDelete", "logrite.obj": obj, "logrite.newObj": newObj });
  if (Array.isArray(obj) && Array.isArray(newObj)) {
    obj.length = 0
	NuxtLogger.debug(`deepDelete(obj=${obj},newObj=${newObj}): obj.length → ${obj.length}`, { "event.action": "deepDelete", "logrite.obj": obj, "logrite.newObj": newObj });
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
	NuxtLogger.warn(`<<< Exiting deepDelete(obj=${obj},newObj=${newObj})`, { "event.action": "deepDelete", "logrite.obj": obj, "logrite.newObj": newObj });
  }
}

function deepAssign (obj: any, newObj: any) {
NuxtLogger.error(`>>> Entering deepAssign(obj=${obj},newObj=${newObj})`, { "event.action": "deepAssign", "logrite.obj": obj, "logrite.newObj": newObj });
  for (const key in newObj) {
    if (key === '__proto__' || key === 'constructor') { continue }
    const val = newObj[key]
    if (isPojoOrArray(val)) {
      const defaultVal = Array.isArray(val) ? [] : {}
	NuxtLogger.error(`deepAssign(obj=${obj},newObj=${newObj}): defaultVal → ${defaultVal}`, { "event.action": "deepAssign", "logrite.obj": obj, "logrite.newObj": newObj });
      if (Array.isArray(obj[key]) !== Array.isArray(val)) {
        obj[key] = defaultVal
      } else {
        obj[key] ??= defaultVal
      }

      deepAssign(obj[key], val)
    } else {
      obj[key] = val
	NuxtLogger.warn(`<<< Exiting deepAssign(obj=${obj},newObj=${newObj})`, { "event.action": "deepAssign", "logrite.obj": obj, "logrite.newObj": newObj });
    }
  }
}

export function useAppConfig (): AppConfig {
NuxtLogger.error('>>> Entering useAppConfig()', { "event.action": "useAppConfig" });
  const nuxtApp = useNuxtApp()
  nuxtApp._appConfig ||= (import.meta.server ? klona(__appConfig) : reactive(__appConfig)) as AppConfig
NuxtLogger.error(`useAppConfig(): nuxtApp → ${nuxtApp}`, { "event.action": "useAppConfig" });
NuxtLogger.warn('<<< Exiting useAppConfig()', { "event.action": "useAppConfig" });
  return nuxtApp._appConfig
}

export function _replaceAppConfig (newConfig: AppConfig): void {
NuxtLogger.error(`>>> Entering _replaceAppConfig(newConfig=${newConfig})`, { "event.action": "_replaceAppConfig", "logrite.newConfig": newConfig });
  const appConfig = useAppConfig()

NuxtLogger.error(`_replaceAppConfig(newConfig=${newConfig}): appConfig → ${appConfig}`, { "event.action": "_replaceAppConfig", "logrite.newConfig": newConfig });
  deepAssign(appConfig, newConfig)
  deepDelete(appConfig, newConfig)
NuxtLogger.warn(`<<< Exiting _replaceAppConfig(newConfig=${newConfig})`, { "event.action": "_replaceAppConfig", "logrite.newConfig": newConfig });
}

/**
 * Deep assign the current appConfig with the new one.
 *
 * Will preserve existing properties.
 */
export function updateAppConfig (appConfig: DeepPartial<AppConfig>): void {
NuxtLogger.error(`>>> Entering updateAppConfig(appConfig=${appConfig})`, { "event.action": "updateAppConfig", "logrite.appConfig": appConfig });
  const _appConfig = useAppConfig()
  deepAssign(_appConfig, appConfig)
NuxtLogger.error(`updateAppConfig(appConfig=${appConfig}): _appConfig → ${_appConfig}`, { "event.action": "updateAppConfig", "logrite.appConfig": appConfig });
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
