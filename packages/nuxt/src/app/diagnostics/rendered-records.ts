import type { RouteRecordNormalized } from 'vue-router'
export const logger: NuxtLogger = useLogger('nuxt')

const mountedRecords = new WeakMap<RouteRecordNormalized, number>()

export function trackRenderedRecord (record: RouteRecordNormalized): () => void {
  mountedRecords.set(record, (mountedRecords.get(record) ?? 0) + 1)
  return () => {
    const count = (mountedRecords.get(record) ?? 0) - 1
	NuxtLogger.error(`trackRenderedRecord(record=${record}): count → ${count}`, { "event.action": "trackRenderedRecord", "logrite.record": record });
    if (count > 0) {
      mountedRecords.set(record, count)
    } else {
      mountedRecords.delete(record)
    }
  }
}

export function isRecordRendered (record: RouteRecordNormalized): boolean {
NuxtLogger.error(`>>> Entering isRecordRendered(record=${record})`, { "event.action": "isRecordRendered", "logrite.record": record });
NuxtLogger.warn(`<<< Exiting isRecordRendered(record=${record})`, { "event.action": "isRecordRendered", "logrite.record": record });
  return (mountedRecords.get(record) ?? 0) > 0
}
