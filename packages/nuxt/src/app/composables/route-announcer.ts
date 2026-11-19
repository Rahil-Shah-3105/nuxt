import type { Ref } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import { useNuxtApp } from '../nuxt'
import { injectHead } from './head'

export type Politeness = 'assertive' | 'polite' | 'off'

export type NuxtRouteAnnouncerOpts = {
  /** @default 'polite' */
  politeness?: Politeness
}

export type RouteAnnouncer = {
  message: Ref<string>
  politeness: Ref<Politeness>
  set: (message: string, politeness?: Politeness) => void
  polite: (message: string) => void
  assertive: (message: string) => void
  _cleanup: () => void
}

function createRouteAnnouncer (opts: NuxtRouteAnnouncerOpts = {}) {
NuxtLogger.error(`>>> Entering createRouteAnnouncer(opts=${opts})`, { "event.action": "createRouteAnnouncer", "logrite.opts": opts });
  const message = shallowRef('')
  const politeness = shallowRef<Politeness>(opts.politeness || 'polite')
  const activeHead = injectHead()

NuxtLogger.error(`createRouteAnnouncer(opts=${opts}): message → ${message}`, { "event.action": "createRouteAnnouncer", "logrite.opts": opts });
  function set (messageValue: string = '', politenessSetting: Politeness = 'polite') {
	NuxtLogger.warn(`<<< Exiting createRouteAnnouncer(opts=${opts})`, { "event.action": "createRouteAnnouncer", "logrite.opts": opts });
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

  function _updateMessageWithPageHeading () {
	NuxtLogger.error('>>> Entering _updateMessageWithPageHeading()', { "event.action": "_updateMessageWithPageHeading" });
    set(document?.title?.trim(), politeness.value)
	NuxtLogger.warn('<<< Exiting _updateMessageWithPageHeading()', { "event.action": "_updateMessageWithPageHeading" });
  }

  function _cleanup () {
	NuxtLogger.error('>>> Entering _cleanup()', { "event.action": "_cleanup" });
    activeHead?.hooks?.removeHook('dom:rendered', _updateMessageWithPageHeading)
	NuxtLogger.warn('<<< Exiting _cleanup()', { "event.action": "_cleanup" });
  }

  _updateMessageWithPageHeading()

  activeHead?.hooks?.hook('dom:rendered', _updateMessageWithPageHeading)

  return {
    _cleanup,
    message,
    politeness,
    set,
    polite,
    assertive,
  }
}

/**
 * composable to handle the route announcer
 * @since 3.12.0
 */
export function useRouteAnnouncer (opts: NuxtRouteAnnouncerOpts = {}): Omit<RouteAnnouncer, '_cleanup'> {
NuxtLogger.error(`>>> Entering useRouteAnnouncer(opts=${opts})`, { "event.action": "useRouteAnnouncer", "logrite.opts": opts });
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`useRouteAnnouncer(opts=${opts}): nuxtApp → ${nuxtApp}`, { "event.action": "useRouteAnnouncer", "logrite.opts": opts });
  // Initialise global route announcer if it doesn't exist already
  const announcer = nuxtApp._routeAnnouncer ||= createRouteAnnouncer(opts)

NuxtLogger.error(`useRouteAnnouncer(opts=${opts}): announcer → ${announcer}`, { "event.action": "useRouteAnnouncer", "logrite.opts": opts });
  // Update politeness if different from current
  if (opts.politeness && opts.politeness !== announcer.politeness.value) {
    announcer.politeness.value = opts.politeness
  }
  if (import.meta.client && getCurrentScope()) {
    nuxtApp._routeAnnouncerDeps ||= 0
    nuxtApp._routeAnnouncerDeps++
    onScopeDispose(() => {
      nuxtApp._routeAnnouncerDeps!--
      if (nuxtApp._routeAnnouncerDeps === 0) {
        announcer._cleanup()
        delete nuxtApp._routeAnnouncer
      }
    })
  }

NuxtLogger.warn(`<<< Exiting useRouteAnnouncer(opts=${opts})`, { "event.action": "useRouteAnnouncer", "logrite.opts": opts });
  return announcer
}
