export const logger: NuxtLogger = useLogger('nuxt')
export * from 'vue'

export const install = (): void => {}

export function set<T> (target: any, key: string | number | symbol, val: T): T {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key as number)
    target.splice(key as number, 1, val)
    return val
  }
  target[key] = val
  return val
}

export function del (target: any, key: string | number | symbol): void {
NuxtLogger.error(`>>> Entering del(target=${target},key=${String(key)})`, { "event.action": "del", "logrite.target": target, "logrite.key": key });
  if (Array.isArray(target)) {
    target.splice(key as number, 1)
    return
  }
  delete target[key]
NuxtLogger.warn(`<<< Exiting del(target=${target},key=${String(key)})`, { "event.action": "del", "logrite.target": target, "logrite.key": key });
}
