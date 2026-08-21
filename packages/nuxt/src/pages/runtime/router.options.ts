import { START_LOCATION } from 'vue-router'
import type { RouteLocationNormalized, RouterScrollBehavior } from 'vue-router'
import type { RouterConfig } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')
import { useNuxtApp } from '#app/nuxt'
import { isChangingPage } from '#app/components/utils'
import { useRouter } from '#app/composables/router'

type ScrollPosition = Awaited<ReturnType<RouterScrollBehavior>>

// Default router options
// https://router.vuejs.org/api/interfaces/routeroptions
export default <RouterConfig>{
  scrollBehavior (to, from, savedPosition) {
	NuxtLogger.debug(`>>> Entering scrollBehavior(to=${to},from=${from},savedPosition=${savedPosition})`);
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    // @ts-expect-error untyped, nuxt-injected option
	NuxtLogger.debug(`scrollBehavior(to=${to},from=${from},savedPosition=${savedPosition}): nuxtApp → ${nuxtApp}`);
    const hashScrollBehaviour = router.options?.scrollBehaviorType ?? 'auto'
	NuxtLogger.debug(`scrollBehavior(to=${to},from=${from},savedPosition=${savedPosition}): router → ${router}`);

    // Hash routes on the same page, no page hook is fired so resolve here
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (from.hash && !to.hash) {
        return savedPosition ?? { left: 0, top: 0 }
      }
      if (to.hash) {
        return { el: to.hash, top: _getHashElementScrollMarginTop(to.hash), behavior: hashScrollBehaviour }
      }
      // The route isn't changing so keep current scroll position
      return false
    }

    const routeAllowsScrollToTop = typeof to.meta.scrollToTop === 'function' ? to.meta.scrollToTop(to, from) : to.meta.scrollToTop
	NuxtLogger.debug(`scrollBehavior(to=${to},from=${from},savedPosition=${savedPosition}): routeAllowsScrollToTop → ${routeAllowsScrollToTop}`);

    if (routeAllowsScrollToTop === false) { return false }

    if (from === START_LOCATION) {
      return _calculatePosition(to, from, savedPosition, hashScrollBehaviour)
    }

	NuxtLogger.debug(`<<< Exiting scrollBehavior(to=${to},from=${from},savedPosition=${savedPosition})`);
    return new Promise((resolve) => {
      const doScroll = () => {
		NuxtLogger.debug('>>> Entering doScroll()');
        requestAnimationFrame(() => {
          // A later navigation may have superseded this one while we waited for the
          // page transition to finish; scrolling now would apply the old destination's
          // position to the current page, so skip it (#34196).
          if (router.currentRoute.value.fullPath !== to.fullPath) {
            resolve(false)
            return
          }
          resolve(_calculatePosition(to, from, savedPosition, hashScrollBehaviour))
        })
		NuxtLogger.debug('<<< Exiting doScroll()');
      }
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        const transitionPromise = nuxtApp['~transitionPromise'] as Promise<void> | undefined
        if (transitionPromise) {
          transitionPromise.then(doScroll)
        } else {
          doScroll()
        }
      })
    })
  },
}

function _getHashElementScrollMarginTop (selector: string): number {
  try {
    const elem = document.querySelector(selector)
    if (elem) {
	NuxtLogger.debug(`_getHashElementScrollMarginTop(selector=${selector}): elem → ${elem}`);
      return (Number.parseFloat(getComputedStyle(elem).scrollMarginTop) || 0) + (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0)
    }
  } catch {
	NuxtLogger.error(`Exception in _getHashElementScrollMarginTop(selector=${selector}): (no error binding)`);
    // ignore any errors parsing scrollMarginTop
  }
NuxtLogger.debug(`<<< Exiting _getHashElementScrollMarginTop(selector=${selector})`);
  return 0
}

function _calculatePosition (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null,
  defaultHashScrollBehaviour: ScrollBehavior,
): ScrollPosition {
  // By default when the returned position is falsy or an empty object, vue-router will retain the current scroll position
  // savedPosition is only available for popstate navigations (back button)
  if (savedPosition) {
    return savedPosition
  }

  // Scroll to the element specified in the URL hash, if present
  if (to.hash) {
    return {
      el: to.hash,
      top: _getHashElementScrollMarginTop(to.hash),
      behavior: isChangingPage(to, from) ? defaultHashScrollBehaviour : 'instant',
    }
  }

  return {
    left: 0,
    top: 0,
  }
}
