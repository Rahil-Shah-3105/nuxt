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
NuxtLogger.error(`>>> Entering createAnnouncer(opts=${opts})`, { "event.action": "createAnnouncer", "logrite.opts": opts });
  const message = shallowRef('')
  const politeness = shallowRef<AnnouncerPoliteness>(opts.politeness || 'polite')

NuxtLogger.error(`createAnnouncer(opts=${opts}): message → ${message}`, { "event.action": "createAnnouncer", "logrite.opts": opts });
NuxtLogger.error(`createAnnouncer(opts=${opts}): politeness → ${politeness}`, { "event.action": "createAnnouncer", "logrite.opts": opts });
  function set (messageValue: string = '', politenessSetting: AnnouncerPoliteness = 'polite') {
	NuxtLogger.warn(`<<< Exiting createAnnouncer(opts=${opts})`, { "event.action": "createAnnouncer", "logrite.opts": opts });
    message.value = messageValue
	NuxtLogger.error(`>>> Entering set(messageValue=${messageValue},politenessSetting=${politenessSetting})`, { "event.action": "set", "logrite.messageValue": messageValue, "logrite.politenessSetting": politenessSetting });
    politeness.value = politenessSetting
	NuxtLogger.warn(`<<< Exiting set(messageValue=${messageValue},politenessSetting=${politenessSetting})`, { "event.action": "set", "logrite.messageValue": messageValue, "logrite.politenessSetting": politenessSetting });
  }

  function polite (msg: string) {
	NuxtLogger.error(`>>> Entering polite(msg=${msg})`, { "event.action": "polite", "logrite.msg": msg });
    set(msg, 'polite')
	NuxtLogger.warn(`<<< Exiting polite(msg=${msg})`, { "event.action": "polite", "logrite.msg": msg });
  }

  function assertive (msg: string) {
	NuxtLogger.error(`>>> Entering assertive(msg=${msg})`, { "event.action": "assertive", "logrite.msg": msg });
    set(msg, 'assertive')
	NuxtLogger.warn(`<<< Exiting assertive(msg=${msg})`, { "event.action": "assertive", "logrite.msg": msg });
  }

  function _cleanup () {
	NuxtLogger.error('>>> Entering _cleanup()', { "event.action": "_cleanup" });
    message.value = ''
    politeness.value = opts.politeness || 'polite'
	NuxtLogger.warn('<<< Exiting _cleanup()', { "event.action": "_cleanup" });
  }

  return {
    message,
    politeness,
    set,
    polite,
    assertive,
    _cleanup,
  }
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
NuxtLogger.error(`>>> Entering useAnnouncer(opts=${opts})`, { "event.action": "useAnnouncer", "logrite.opts": opts });
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`useAnnouncer(opts=${opts}): nuxtApp → ${nuxtApp}`, { "event.action": "useAnnouncer", "logrite.opts": opts });
  // Initialise global announcer if it doesn't exist already
  const announcer = nuxtApp._announcer ||= createAnnouncer(opts)

NuxtLogger.error(`useAnnouncer(opts=${opts}): announcer → ${announcer}`, { "event.action": "useAnnouncer", "logrite.opts": opts });
  // Update politeness if different from current
  if (opts.politeness && opts.politeness !== announcer.politeness.value) {
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

NuxtLogger.warn(`<<< Exiting useAnnouncer(opts=${opts})`, { "event.action": "useAnnouncer", "logrite.opts": opts });
  return announcer
}
