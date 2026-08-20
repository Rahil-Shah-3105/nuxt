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
NuxtLogger.debug(`>>> Entering createRouteAnnouncer(opts=${opts})`);
  const message = shallowRef('')
  const politeness = shallowRef<Politeness>(opts.politeness || 'polite')
  const activeHead = injectHead()

NuxtLogger.debug(`createRouteAnnouncer(opts=${opts}): message → ${message}`);
NuxtLogger.debug(`createRouteAnnouncer(opts=${opts}): politeness → ${politeness}`);
NuxtLogger.debug(`createRouteAnnouncer(opts=${opts}): activeHead → ${activeHead}`);
  function set (messageValue: string = '', politenessSetting: Politeness = 'polite') {
    message.value = messageValue
	NuxtLogger.debug(`>>> Entering set(messageValue=${messageValue},politenessSetting=${politenessSetting})`);
    politeness.value = politenessSetting
	NuxtLogger.debug(`<<< Exiting set(messageValue=${messageValue},politenessSetting=${politenessSetting})`);
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

  function _updateMessageWithPageHeading () {
	NuxtLogger.debug('>>> Entering _updateMessageWithPageHeading()');
    set(document?.title?.trim(), politeness.value)
	NuxtLogger.debug('<<< Exiting _updateMessageWithPageHeading()');
  }

  function _cleanup () {
	NuxtLogger.debug('>>> Entering _cleanup()');
    activeHead?.hooks?.removeHook('dom:rendered', _updateMessageWithPageHeading)
	NuxtLogger.debug('<<< Exiting _cleanup()');
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
NuxtLogger.debug(`<<< Exiting createRouteAnnouncer(opts=${opts})`);
}

/**
 * composable to handle the route announcer
 * @since 3.12.0
 */
export function useRouteAnnouncer (opts: NuxtRouteAnnouncerOpts = {}): Omit<RouteAnnouncer, '_cleanup'> {
  const nuxtApp = useNuxtApp()

NuxtLogger.debug(`useRouteAnnouncer(opts=${opts}): nuxtApp → ${nuxtApp}`);
  // Initialise global route announcer if it doesn't exist already
  const announcer = nuxtApp._routeAnnouncer ||= createRouteAnnouncer(opts)

NuxtLogger.debug(`useRouteAnnouncer(opts=${opts}): announcer → ${announcer}`);
  // Update politeness if different from current
  if (opts.politeness && opts.politeness !== announcer.politeness.value) {
	NuxtLogger.debug(`>>> Entering useRouteAnnouncer(opts=${opts})`);
	NuxtLogger.debug(`<<< Exiting useRouteAnnouncer(opts=${opts})`);
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

  return announcer
}
