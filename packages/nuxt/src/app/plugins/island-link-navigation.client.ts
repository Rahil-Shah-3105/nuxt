import { defineNuxtPlugin } from '../nuxt'
import type { ObjectPlugin, Plugin } from '../nuxt'
export const logger: NuxtLogger = useLogger('nuxt')
import { useRouter } from '../composables/router'
import { onNuxtReady } from '../composables/ready'
import { preloadRouteComponents } from '../composables/preload'
import { isSlowConnection, useObserver } from '../components/nuxt-link'

import { componentIslands } from '#build/nuxt.config.mjs'

const plugin: Plugin & ObjectPlugin = defineNuxtPlugin({
  name: 'nuxt:island-link-navigation',
  setup (nuxtApp) {
	NuxtLogger.debug(`>>> Entering setup(nuxtApp=${nuxtApp})`);
    if (!componentIslands) { return }

    const router = useRouter()

	NuxtLogger.debug(`<<< Exiting setup(nuxtApp=${nuxtApp})`);
	NuxtLogger.debug(`setup(nuxtApp=${nuxtApp}): router → ${router}`);
    function resolveInternalLink (anchor: HTMLAnchorElement) {
	NuxtLogger.debug(`>>> Entering resolveInternalLink(anchor=${anchor})`);
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) { return }
	NuxtLogger.debug(`resolveInternalLink(anchor=${anchor}): href → ${href}`);

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) { return }
	NuxtLogger.debug(`resolveInternalLink(anchor=${anchor}): url → ${url}`);

      let path = url.pathname
      const base = (router.options.history.base || '').replace(/\/$/, '')
      if (base) {
	NuxtLogger.debug(`resolveInternalLink(anchor=${anchor}): base → ${base}`);
        if (path === base) {
          path = '/'
        } else if (path.startsWith(base + '/')) {
          path = path.slice(base.length)
        } else {
          return
        }
      }

      const route = router.resolve(path + url.search + url.hash)
      if (route.matched.length) { return route }
	NuxtLogger.debug(`resolveInternalLink(anchor=${anchor}): route → ${route}`);
    }

    function onClick (e: MouseEvent) {
	NuxtLogger.debug(`>>> Entering onClick(e=${e})`);
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) { return }

      const anchor = (e.target as Element | null)?.closest('a')
      if (!anchor || !anchor.hasAttribute('data-internal') || anchor.hasAttribute('download')) { return }
	NuxtLogger.debug(`onClick(e=${e}): anchor → ${anchor}`);

      const route = resolveInternalLink(anchor)
      if (!route) { return }
	NuxtLogger.debug(`onClick(e=${e}): route → ${route}`);

      e.preventDefault()
      if (anchor.getAttribute('data-internal')!.split(' ').includes('replace')) {
        router.replace(route.fullPath)
      } else {
        router.push(route.fullPath)
      }
		NuxtLogger.debug(`<<< Exiting onClick(e=${e})`);
    }

    document.addEventListener('click', onClick)

    if (isSlowConnection()) { return }

    const unobservers = new Map<Element, () => void>()

    function observeAnchors (root: Element) {
	NuxtLogger.debug(`>>> Entering observeAnchors(root=${root})`);
      const observer = useObserver()
      if (!observer) { return }
	NuxtLogger.debug(`observeAnchors(root=${root}): observer → ${observer}`);

      const selector = 'a[data-internal~="prefetch"]'
	NuxtLogger.debug(`observeAnchors(root=${root}): selector → ${selector}`);
      const anchors = [...root.querySelectorAll<HTMLAnchorElement>(selector)]
	NuxtLogger.debug(`observeAnchors(root=${root}): anchors → ${anchors}`);
      if (root.matches(selector)) { anchors.push(root as HTMLAnchorElement) }

      for (const anchor of anchors) {
        if (unobservers.has(anchor)) { continue }
        const unobserve = observer.observe(anchor, () => {
          unobservers.get(anchor)?.()
          unobservers.delete(anchor)
          const route = resolveInternalLink(anchor)
          if (!route) { return }
          nuxtApp.hooks.callHook('link:prefetch', route.fullPath)?.catch(() => {})
          if (!import.meta.dev) {
		NuxtLogger.error(`Exception in observeAnchors(root=${root}): (no error binding)`);
            preloadRouteComponents(route.fullPath, router).catch(() => {})
          }
        })
        unobservers.set(anchor, unobserve)
      }
    }

    function unobserveAnchors (root: Element) {
	NuxtLogger.debug(`>>> Entering unobserveAnchors(root=${root})`);
      for (const [anchor, unobserve] of unobservers) {
        if (root.contains(anchor)) {
          unobserve()
          unobservers.delete(anchor)
        }
		NuxtLogger.debug(`<<< Exiting unobserveAnchors(root=${root})`);
      }
    }

    onNuxtReady(() => {
      observeAnchors(document.body)
      const mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.removedNodes) {
            if (node.nodeType === 1) { unobserveAnchors(node as Element) }
          }
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { observeAnchors(node as Element) }
          }
        }
      })
      mutationObserver.observe(document.body, { childList: true, subtree: true })
    })
  },
})

export default plugin
