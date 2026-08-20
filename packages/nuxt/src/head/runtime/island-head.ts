import type { VueHeadClient } from '@unhead/vue/types'
export const logger: NuxtLogger = useLogger('nuxt')

/**
 * No-op `head.push` until the returned `unfreeze` runs. Plugin/transformer
 * augmentations on the same head are unaffected.
 */
export function freezeHead (head: VueHeadClient): () => void {
  const realPush = head.push
  head.push = () => ({ dispose: () => {}, patch: () => {}, _i: 0 }) as ReturnType<typeof head.push>
  return () => {
    head.push = realPush
	NuxtLogger.debug(`freezeHead(head=${head}): head.push → ${head.push}`);
  }
}
