import type { Ref } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import { useNuxtApp } from '../nuxt'

export type AnnouncerPoliteness = 'assertive' | 'polite' | 'off'

export type NuxtAnnouncerOpts = {
  /** @default 'polite' */
  politeness?: AnnouncerPoliteness
}

export type NuxtAnnouncer = {
  message: Ref<string>
  politeness: Ref<AnnouncerPoliteness>
  set: (message: string, politeness?: AnnouncerPoliteness) => void
  polite: (message: string) => void
  assertive: (message: string) => void
  _cleanup: () => void
}

function createAnnouncer (opts: NuxtAnnouncerOpts = {}): NuxtAnnouncer {
NuxtLogger.debug(`>>> Entering createAnnouncer(opts=${opts})`);
  const message = shallowRef('')
  const politeness = shallowRef<AnnouncerPoliteness>(opts.politeness || 'polite')

NuxtLogger.debug(`createAnnouncer(opts=${opts}): message → ${message}`);
NuxtLogger.debug(`createAnnouncer(opts=${opts}): politeness → ${politeness}`);
  function set (messageValue: string = '', politenessSetting: AnnouncerPoliteness = 'polite') {
	NuxtLogger.debug(`>>> Entering set(messageValue=${messageValue},politenessSetting=${politenessSetting})`);
    message.value = messageValue
    politeness.value = politenessSetting
  }

  function polite (msg: string) {
	NuxtLogger.debug(`>>> Entering polite(msg=${msg})`);
    set(msg, 'polite')
	NuxtLogger.debug(`<<< Exiting polite(msg=${msg})`);
  }

  function assertive (msg: string) {
	NuxtLogger.debug(`>>> Entering assertive(msg=${msg})`);
    set(msg, 'assertive')
	NuxtLogger.debug(`<<< Exiting assertive(msg=${msg})`);
  }

  function _cleanup () {
	NuxtLogger.debug('>>> Entering _cleanup()');
    message.value = ''
    politeness.value = opts.politeness || 'polite'
  }

  return {
    message,
    politeness,
    set,
    polite,
    assertive,
    _cleanup,
  }
NuxtLogger.debug(`<<< Exiting createAnnouncer(opts=${opts})`);
}

/**
 * Composable for announcing messages to screen readers
 * @since 4.4.2
 * @example
 * const { polite, assertive } = useAnnouncer()
 * polite('Item saved successfully')
 * assertive('Error: Form is invalid')
 */
export function useAnnouncer (opts: NuxtAnnouncerOpts = {}): Omit<NuxtAnnouncer, '_cleanup'> {
  const nuxtApp = useNuxtApp()

NuxtLogger.debug(`useAnnouncer(opts=${opts}): nuxtApp → ${nuxtApp}`);
  // Initialise global announcer if it doesn't exist already
  const announcer = nuxtApp._announcer ||= createAnnouncer(opts)

NuxtLogger.debug(`useAnnouncer(opts=${opts}): announcer → ${announcer}`);
  // Update politeness if different from current
  if (opts.politeness && opts.politeness !== announcer.politeness.value) {
	NuxtLogger.debug(`>>> Entering useAnnouncer(opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting useAnnouncer(opts=${opts})`);
    announcer.politeness.value = opts.politeness
  }

  if (import.meta.client && getCurrentScope()) {
    nuxtApp._announcerDeps ||= 0
    nuxtApp._announcerDeps++
    onScopeDispose(() => {
      nuxtApp._announcerDeps!--
      if (nuxtApp._announcerDeps === 0) {
        announcer._cleanup()
        delete nuxtApp._announcer
      }
    })
  }

  return announcer
}
