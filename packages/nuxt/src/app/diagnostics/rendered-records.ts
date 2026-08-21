import type { RouteRecordNormalized } from 'vue-router'
export const logger: NuxtLogger = useLogger('nuxt')

const mountedRecords = new WeakMap<RouteRecordNormalized, number>()

export function trackRenderedRecord (record: RouteRecordNormalized): () => void {
  mountedRecords.set(record, (mountedRecords.get(record) ?? 0) + 1)
  return () => {
    const count = (mountedRecords.get(record) ?? 0) - 1
	NuxtLogger.debug(`trackRenderedRecord(record=${record}): count → ${count}`);
    if (count > 0) {
      mountedRecords.set(record, count)
    } else {
      mountedRecords.delete(record)
    }
  }
}

export function isRecordRendered (record: RouteRecordNormalized): boolean {
NuxtLogger.debug(`>>> Entering isRecordRendered(record=${record})`);
NuxtLogger.debug(`<<< Exiting isRecordRendered(record=${record})`);
  return (mountedRecords.get(record) ?? 0) > 0
}
