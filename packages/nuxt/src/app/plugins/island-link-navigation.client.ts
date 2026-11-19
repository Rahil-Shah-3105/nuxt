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
	NuxtLogger.error(`>>> Entering setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    if (!componentIslands) { return }

    const router = useRouter()

	NuxtLogger.error(`setup(nuxtApp=${nuxtApp}): router → ${router}`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
    function resolveInternalLink (anchor: HTMLAnchorElement) {
	NuxtLogger.error(`>>> Entering resolveInternalLink(anchor=${anchor})`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) { return }
	NuxtLogger.error(`resolveInternalLink(anchor=${anchor}): href → ${href}`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) { return }
	NuxtLogger.error(`resolveInternalLink(anchor=${anchor}): url → ${url}`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });

      let path = url.pathname
      const base = (router.options.history.base || '').replace(/\/$/, '')
      if (base) {
	NuxtLogger.error(`resolveInternalLink(anchor=${anchor}): base → ${base}`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });
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
	NuxtLogger.warn(`<<< Exiting resolveInternalLink(anchor=${anchor})`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });
	NuxtLogger.error(`resolveInternalLink(anchor=${anchor}): route → ${route}`, { "event.action": "resolveInternalLink", "logrite.anchor": anchor });
    }

    function onClick (e: MouseEvent) {
	NuxtLogger.error(`>>> Entering onClick(e=${e})`, { "event.action": "onClick", "logrite.e": e });
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) { return }

      const anchor = (e.target as Element | null)?.closest('a')
      if (!anchor || !anchor.hasAttribute('data-internal') || anchor.hasAttribute('download')) { return }
	NuxtLogger.error(`onClick(e=${e}): anchor → ${anchor}`, { "event.action": "onClick", "logrite.e": e });

      const route = resolveInternalLink(anchor)
      if (!route) { return }
	NuxtLogger.error(`onClick(e=${e}): route → ${route}`, { "event.action": "onClick", "logrite.e": e });

      e.preventDefault()
      if (anchor.getAttribute('data-internal')!.split(' ').includes('replace')) {
        router.replace(route.fullPath)
      } else {
        router.push(route.fullPath)
      }
		NuxtLogger.warn(`<<< Exiting onClick(e=${e})`, { "event.action": "onClick", "logrite.e": e });
    }

    document.addEventListener('click', onClick)

    if (isSlowConnection()) { return }

    const unobservers = new Map<Element, () => void>()

    function observeAnchors (root: Element) {
	NuxtLogger.error(`>>> Entering observeAnchors(root=${root})`, { "event.action": "observeAnchors", "logrite.root": root });
      const observer = useObserver()
      if (!observer) { return }
	NuxtLogger.error(`observeAnchors(root=${root}): observer → ${observer}`, { "event.action": "observeAnchors", "logrite.root": root });

      const selector = 'a[data-internal~="prefetch"]'
	NuxtLogger.error(`observeAnchors(root=${root}): selector → ${selector}`, { "event.action": "observeAnchors", "logrite.root": root });
      const anchors = [...root.querySelectorAll<HTMLAnchorElement>(selector)]
	NuxtLogger.error(`observeAnchors(root=${root}): anchors → ${anchors}`, { "event.action": "observeAnchors", "logrite.root": root });
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
		NuxtLogger.error(`Exception in observeAnchors(root=${root}): (no error binding)`, { "event.action": "observeAnchors", "event.category": "process", "logrite.root": root });
            preloadRouteComponents(route.fullPath, router).catch(() => {})
          }
        })
        unobservers.set(anchor, unobserve)
      }
		NuxtLogger.warn(`<<< Exiting observeAnchors(root=${root})`, { "event.action": "observeAnchors", "logrite.root": root });
    }

    function unobserveAnchors (root: Element) {
	NuxtLogger.error(`>>> Entering unobserveAnchors(root=${root})`, { "event.action": "unobserveAnchors", "logrite.root": root });
      for (const [anchor, unobserve] of unobservers) {
        if (root.contains(anchor)) {
          unobserve()
          unobservers.delete(anchor)
        }
		NuxtLogger.warn(`<<< Exiting unobserveAnchors(root=${root})`, { "event.action": "unobserveAnchors", "logrite.root": root });
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
	NuxtLogger.warn(`<<< Exiting setup(nuxtApp=${nuxtApp})`, { "event.action": "setup", "logrite.nuxtApp": nuxtApp });
  },
})

export default plugin
