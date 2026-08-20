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
  // Nuxt 4 will throw an error if the context is missing
  const nuxt = nuxtApp || useNuxtApp()
NuxtLogger.debug(`injectHead(nuxtApp=${nuxtApp}): nuxt → ${nuxt}`);
  return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
    if (hasInjectionContext()) {
	NuxtLogger.debug(`<<< Exiting injectHead(nuxtApp=${nuxtApp})`);
      const head = inject<VueHeadClient>(headSymbol)
      // should not be possible
	NuxtLogger.debug(`injectHead(nuxtApp=${nuxtApp}): head → ${head}`);
      if (!head) {
        throw unheadDiagnostics.NUXT_E6001()
      }
      return head
    }
  }) as VueHeadClient
}

interface NuxtUseHeadOptions extends UseHeadOptions {
  nuxt?: NuxtApp
}

export function useHead (input: UseHeadInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadInput> {
NuxtLogger.debug(`>>> Entering useHead(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.debug(`useHead(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useHead(input=${input},options=${options})`);
  return headCore(input, { head, ...options }) as ActiveHeadEntry<UseHeadInput>
}

export function useHeadSafe (input: UseHeadSafeInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
NuxtLogger.debug(`>>> Entering useHeadSafe(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.debug(`useHeadSafe(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useHeadSafe(input=${input},options=${options})`);
  return headSafe(input, { head, ...options }) as ActiveHeadEntry<UseHeadSafeInput>
}

export function useSeoMeta (input: UseSeoMetaInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
NuxtLogger.debug(`>>> Entering useSeoMeta(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
NuxtLogger.debug(`useSeoMeta(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useSeoMeta(input=${input},options=${options})`);
  return seoMeta(input, { head, ...options }) as ActiveHeadEntry<UseSeoMetaInput>
}

/**
 * @deprecated Use `useHead` instead and wrap with `if (import.meta.server)`
 */
export function useServerHead (input: UseHeadInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadInput> {
NuxtLogger.debug(`>>> Entering useServerHead(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.debug(`useServerHead(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useServerHead(input=${input},options=${options})`);
  return serverHead(input, { head, ...options }) as ActiveHeadEntry<UseHeadInput>
}

/**
 * @deprecated Use `useHeadSafe` instead and wrap with `if (import.meta.server)`
 */
export function useServerHeadSafe (input: UseHeadSafeInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> {
NuxtLogger.debug(`>>> Entering useServerHeadSafe(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.debug(`useServerHeadSafe(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useServerHeadSafe(input=${input},options=${options})`);
  return serverHeadSafe(input, { head, ...options }) as ActiveHeadEntry<UseHeadSafeInput>
}

/**
 * @deprecated Use `useSeoMeta` instead and wrap with `if (import.meta.server)`
 */
export function useServerSeoMeta (input: UseSeoMetaInput, options: NuxtUseHeadOptions = {}): ActiveHeadEntry<UseSeoMetaInput> {
NuxtLogger.debug(`>>> Entering useServerSeoMeta(input=${input},options=${options})`);
  const head = options.head || injectHead(options.nuxt)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
NuxtLogger.debug(`useServerSeoMeta(input=${input},options=${options}): head → ${head}`);
NuxtLogger.debug(`<<< Exiting useServerSeoMeta(input=${input},options=${options})`);
  return serverSeoMeta(input, { head, ...options }) as ActiveHeadEntry<UseSeoMetaInput>
}
