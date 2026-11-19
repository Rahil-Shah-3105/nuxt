import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '../nuxt'

export type LoadingIndicatorOpts = {
  /** @default 2000 */
  duration: number
  /** @default 200 */
  throttle: number
  /** @default 500 */
  hideDelay: number
  /** @default 400 */
  resetDelay: number
  /**
   * You can provide a custom function to customize the progress estimation,
   * which is a function that receives the duration of the loading bar (above)
   * and the elapsed time. It should return a value between 0 and 100.
   */
  estimatedProgress?: (duration: number, elapsed: number) => number
}

export type LoadingIndicator = {
  _cleanup: () => void
  progress: Readonly<ShallowRef<number>>
  isLoading: Readonly<ShallowRef<boolean>>
  error: Readonly<ShallowRef<boolean>>
  start: (opts?: { force?: boolean }) => void
  set: (value: number, opts?: { force?: boolean }) => void
  finish: (opts?: { force?: boolean, error?: boolean }) => void
  clear: () => void
}

function defaultEstimatedProgress (duration: number, elapsed: number): number {
NuxtLogger.error(`>>> Entering defaultEstimatedProgress(duration=${duration},elapsed=${elapsed})`, { "event.action": "defaultEstimatedProgress", "logrite.duration": duration, "logrite.elapsed": elapsed });
  const completionPercentage = elapsed / duration * 100
NuxtLogger.warn(`<<< Exiting defaultEstimatedProgress(duration=${duration},elapsed=${elapsed})`, { "event.action": "defaultEstimatedProgress", "logrite.duration": duration, "logrite.elapsed": elapsed });
  return (2 / Math.PI * 100) * Math.atan(completionPercentage / 50)
}

function createLoadingIndicator (opts: Partial<LoadingIndicatorOpts> = {}) {
NuxtLogger.error(`>>> Entering createLoadingIndicator(opts=${opts})`, { "event.action": "createLoadingIndicator", "logrite.opts": opts });
  const { duration = 2000, throttle = 200, hideDelay = 500, resetDelay = 400 } = opts
  const getProgress = opts.estimatedProgress || defaultEstimatedProgress
  const nuxtApp = useNuxtApp()
  const progress = shallowRef(0)
  const isLoading = shallowRef(false)
  const error = shallowRef(false)
  let done = false
NuxtLogger.error(`createLoadingIndicator(opts=${opts}): nuxtApp → ${nuxtApp}`, { "event.action": "createLoadingIndicator", "logrite.opts": opts });
NuxtLogger.debug(`createLoadingIndicator(opts=${opts}): error.value → ${error.value}`, { "event.action": "createLoadingIndicator", "logrite.opts": opts });
  let rafId: number

  let throttleTimeout: number | NodeJS.Timeout
  let hideTimeout: number | NodeJS.Timeout
  let resetTimeout: number | NodeJS.Timeout

NuxtLogger.warn(`<<< Exiting createLoadingIndicator(opts=${opts})`, { "event.action": "createLoadingIndicator", "logrite.opts": opts });
  const start = (opts: { force?: boolean } = {}) => {
	NuxtLogger.error(`>>> Entering start(opts=${opts})`, { "event.action": "start", "logrite.opts": opts });
    _clearTimeouts()
    error.value = false
    set(0, opts)
	NuxtLogger.warn(`<<< Exiting start(opts=${opts})`, { "event.action": "start", "logrite.opts": opts });
  }

  function set (at = 0, opts: { force?: boolean } = {}) {
	NuxtLogger.error(`>>> Entering set(at=${at},opts=${opts})`, { "event.action": "set", "logrite.at": at, "logrite.opts": opts });
    if (nuxtApp.isHydrating) {
      return
    }
    if (at >= 100) { return finish({ force: opts.force }) }
	NuxtLogger.warn(`<<< Exiting set(at=${at},opts=${opts})`, { "event.action": "set", "logrite.at": at, "logrite.opts": opts });
    _clearTimeouts()
    clear()
    progress.value = at < 0 ? 0 : at
    const throttleTime = opts.force ? 0 : throttle
    if (throttleTime && import.meta.client) {
      throttleTimeout = setTimeout(() => {
        isLoading.value = true
        _startProgress()
      }, throttleTime)
    } else {
      isLoading.value = true
      _startProgress()
    }
  }

  function _hide () {
	NuxtLogger.error('>>> Entering _hide()', { "event.action": "_hide" });
    if (import.meta.client) {
      hideTimeout = setTimeout(() => {
        isLoading.value = false
        resetTimeout = setTimeout(() => { progress.value = 0 }, resetDelay)
      }, hideDelay)
    }
	NuxtLogger.warn('<<< Exiting _hide()', { "event.action": "_hide" });
  }

  function finish (opts: { force?: boolean, error?: boolean } = {}) {
	NuxtLogger.error(`>>> Entering finish(opts=${opts})`, { "event.action": "finish", "logrite.opts": opts });
    progress.value = 100
    done = true
    clear()
    _clearTimeouts()
    if (opts.error) {
      error.value = true
    }
    if (opts.force) {
      progress.value = 0
      isLoading.value = false
    } else {
      _hide()
    }
	NuxtLogger.warn(`<<< Exiting finish(opts=${opts})`, { "event.action": "finish", "logrite.opts": opts });
  }

  function _clearTimeouts () {
	NuxtLogger.error('>>> Entering _clearTimeouts()', { "event.action": "_clearTimeouts" });
    if (import.meta.client) {
      clearTimeout(hideTimeout)
      clearTimeout(resetTimeout)
    }
	NuxtLogger.warn('<<< Exiting _clearTimeouts()', { "event.action": "_clearTimeouts" });
  }

  function clear () {
	NuxtLogger.error('>>> Entering clear()', { "event.action": "clear" });
    if (import.meta.client) {
      clearTimeout(throttleTimeout)
      cancelAnimationFrame(rafId)
    }
	NuxtLogger.warn('<<< Exiting clear()', { "event.action": "clear" });
  }

  function _startProgress () {
	NuxtLogger.error('>>> Entering _startProgress()', { "event.action": "_startProgress" });
    done = false
    let startTimeStamp: number

    function step (timeStamp: number): void {
	NuxtLogger.error(`>>> Entering step(timeStamp=${timeStamp})`, { "event.action": "step", "logrite.timeStamp": timeStamp });
      if (done) { return }

      startTimeStamp ??= timeStamp
      const elapsed = timeStamp - startTimeStamp
      progress.value = Math.max(0, Math.min(100, getProgress(duration, elapsed)))
      if (import.meta.client) {
        rafId = requestAnimationFrame(step)
      }
		NuxtLogger.warn(`<<< Exiting step(timeStamp=${timeStamp})`, { "event.action": "step", "logrite.timeStamp": timeStamp });
    }

    if (import.meta.client) {
      rafId = requestAnimationFrame(step)
    }
  }

  let _cleanup = () => {}
  if (import.meta.client) {
    const unsubLoadingStartHook = nuxtApp.hook('page:loading:start', () => {
      start()
    })
    const unsubLoadingFinishHook = nuxtApp.hook('page:loading:end', () => {
      finish()
    })
    const unsubError = nuxtApp.hook('vue:error', () => finish({ error: true }))

    _cleanup = () => {
      unsubError()
      unsubLoadingStartHook()
      unsubLoadingFinishHook()
      clear()
      _clearTimeouts()
    }
  }

  return {
    _cleanup,
    progress: shallowReadonly(progress),
    isLoading: shallowReadonly(isLoading),
    error: shallowReadonly(error),
    start,
    set,
    finish,
    clear,
  }
}

/**
 * composable to handle the loading state of the page
 * @since 3.9.0
 */
export function useLoadingIndicator (opts: Partial<LoadingIndicatorOpts> = {}): Omit<LoadingIndicator, '_cleanup'> {
NuxtLogger.error(`>>> Entering useLoadingIndicator(opts=${opts})`, { "event.action": "useLoadingIndicator", "logrite.opts": opts });
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`useLoadingIndicator(opts=${opts}): nuxtApp → ${nuxtApp}`, { "event.action": "useLoadingIndicator", "logrite.opts": opts });
  // Initialise global loading indicator if it doesn't exist already
  const indicator = nuxtApp._loadingIndicator ||= createLoadingIndicator(opts)
  if (import.meta.client && getCurrentScope()) {
NuxtLogger.error(`useLoadingIndicator(opts=${opts}): indicator → ${indicator}`, { "event.action": "useLoadingIndicator", "logrite.opts": opts });
    nuxtApp._loadingIndicatorDeps ||= 0
    nuxtApp._loadingIndicatorDeps++
    onScopeDispose(() => {
      nuxtApp._loadingIndicatorDeps!--
      if (nuxtApp._loadingIndicatorDeps === 0) {
        indicator._cleanup()
        delete nuxtApp._loadingIndicator
      }
    })
  }

NuxtLogger.warn(`<<< Exiting useLoadingIndicator(opts=${opts})`, { "event.action": "useLoadingIndicator", "logrite.opts": opts });
  return indicator
}
