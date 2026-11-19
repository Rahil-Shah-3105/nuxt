import type { ActiveHeadEntry, UseHeadInput, UseHeadOptions, UseHeadSafeInput, UseSeoMetaInput, VueHeadClient } from '@unhead/vue/types'
import { hasInjectionContext, inject } from 'vue'
import {
  useHead as headCore,
  useHeadSafe as headSafe,
  headSymbol,
  useSeoMeta as seoMeta, useServerHead as serverHead, useServerHeadSafe as serverHeadSafe,
  useServerSeoMeta as serverSeoMeta,
} from '@unhead/vue'
import { useNuxtApp } from '#app/nuxt'
import type { NuxtApp } from '#app/nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { unheadDiagnostics } from '../../app/diagnostics/head'

/**
 * Injects the head client from the Nuxt context or Vue inject.
 */
export function injectHead (nuxtApp?: NuxtApp): VueHeadClient {
NuxtLogger.error(`>>> Entering injectHead(nuxtApp=${nuxtApp})`, { "event.action": "injectHead", "logrite.nuxtApp": nuxtApp });
  // Nuxt 4 will throw an error if the context is missing
  const nuxt = nuxtApp || useNuxtApp()
NuxtLogger.error(`injectHead(nuxtApp=${nuxtApp}): nuxt → ${nuxt}`, { "event.action": "injectHead", "logrite.nuxtApp": nuxtApp });
  return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
    if (hasInjectionContext()) {
      const head = inject<VueHeadClient>(headSymbol)
      // should not be possible
	NuxtLogger.error(`injectHead(nuxtApp=${nuxtApp}): head → ${head}`, { "event.action": "injectHead", "logrite.nuxtApp": nuxtApp });
      if (!head) {
        throw unheadDiagnostics.NUXT_E6001()
      }
      return head
    }
  }) as VueHeadClient
NuxtLogger.warn(`<<< Exiting injectHead(nuxtApp=${nuxtApp})`, { "event.action": "injectHead", "logrite.nuxtApp": nuxtApp });
}

interface NuxtUseHeadOptions extends UseHeadOptions {
  nuxt?: NuxtApp
}

export function useHead (input: UseHeadInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadInput> {
NuxtLogger.error(`>>> Entering useHead(input=${input},options=${options})`, { "event.action": "useHead", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.error(`useHead(input=${input},options=${options}): head → ${head}`, { "event.action": "useHead", "logrite.options": options });
  return headCore(input, { head, ...options }) as ActiveHeadEntry<UseHeadInput>
}

export function useHeadSafe (input: UseHeadSafeInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
NuxtLogger.error(`>>> Entering useHeadSafe(input=${input},options=${options})`, { "event.action": "useHeadSafe", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.error(`useHeadSafe(input=${input},options=${options}): head → ${head}`, { "event.action": "useHeadSafe", "logrite.options": options });
  return headSafe(input, { head, ...options }) as ActiveHeadEntry<UseHeadSafeInput>
}

export function useSeoMeta (input: UseSeoMetaInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
NuxtLogger.error(`>>> Entering useSeoMeta(input=${input},options=${options})`, { "event.action": "useSeoMeta", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.error(`useSeoMeta(input=${input},options=${options}): head → ${head}`, { "event.action": "useSeoMeta", "logrite.options": options });
  return seoMeta(input, { head, ...options }) as ActiveHeadEntry<UseSeoMetaInput>
}

/**
 * @deprecated Use `useHead` instead and wrap with `if (import.meta.server)`
 */
export function useServerHead (input: UseHeadInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadInput> {
NuxtLogger.error(`>>> Entering useServerHead(input=${input},options=${options})`, { "event.action": "useServerHead", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.warn(`<<< Exiting useServerHead(input=${input},options=${options})`, { "event.action": "useServerHead", "logrite.options": options });
  return serverHead(input, { head, ...options }) as ActiveHeadEntry<UseHeadInput>
}

/**
 * @deprecated Use `useHeadSafe` instead and wrap with `if (import.meta.server)`
 */
export function useServerHeadSafe (input: UseHeadSafeInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
NuxtLogger.error(`>>> Entering useServerHeadSafe(input=${input},options=${options})`, { "event.action": "useServerHeadSafe", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.warn(`<<< Exiting useServerHeadSafe(input=${input},options=${options})`, { "event.action": "useServerHeadSafe", "logrite.options": options });
  return serverHeadSafe(input, { head, ...options }) as ActiveHeadEntry<UseHeadSafeInput>
}

/**
 * @deprecated Use `useSeoMeta` instead and wrap with `if (import.meta.server)`
 */
export function useServerSeoMeta (input: UseSeoMetaInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
NuxtLogger.error(`>>> Entering useServerSeoMeta(input=${input},options=${options})`, { "event.action": "useServerSeoMeta", "logrite.options": options });
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.warn(`<<< Exiting useServerSeoMeta(input=${input},options=${options})`, { "event.action": "useServerSeoMeta", "logrite.options": options });
  return serverSeoMeta(input, { head, ...options }) as ActiveHeadEntry<UseSeoMetaInput>
}
