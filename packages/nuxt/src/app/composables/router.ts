import { getCurrentInstance, getCurrentScope, hasInjectionContext, inject, onScopeDispose } from 'vue'
import type { ComponentInternalInstance, EffectScope } from 'vue'
import type { NavigationFailure, NavigationGuard, RouteLocationNormalized, RouteLocationRaw, Router, useRoute as _useRoute, useRouter as _useRouter } from 'vue-router'
import { decodePath, hasProtocol, isScriptProtocol, joinURL, parseQuery, parseURL, withQuery } from 'ufo'

import type { NuxtLayouts } from '../../pages/runtime/composables'

import { isInComponentSetup, useNuxtApp, useRuntimeConfig } from '../nuxt'
import { PageRouteSymbol } from '../components/injections'
import { sanitizeStatusCode } from '../utils/http-status'
import type { NuxtError } from './error'
import { createError, showError } from './error'
import { getUserTrace } from '../utils'
import { navigationDiagnostics } from '../diagnostics/navigation'
import type { MakeSerializableObject } from '../../pages/runtime/utils'
export const logger: NuxtLogger = useLogger('nuxt')

/** @since 3.0.0 */
export const useRouter: typeof _useRouter = () => {
NuxtLogger.error('>>> Entering useRouter()', { "event.action": "useRouter" });
  return useNuxtApp()?.$router as unknown as Router
}

/**
 * Whether the current effect scope is (a descendant of) the component instance's scope.
 * A detached scope (e.g. `createSharedComposable`) outlives the component, so the
 * per-page route injected there would freeze after navigation (#18903).
 */
function getParentScope (scope: EffectScope): EffectScope | undefined {
NuxtLogger.error(`>>> Entering getParentScope(scope=${scope})`, { "event.action": "getParentScope" });
  // Vue <= 3.5 tracks the parent scope directly; Vue >= 3.6 links it as the scope's sole subscriber.
  const internal = scope as EffectScope & { parent?: EffectScope, subs?: { sub?: EffectScope } }
NuxtLogger.warn(`<<< Exiting getParentScope(scope=${scope})`, { "event.action": "getParentScope" });
  return internal.parent ?? internal.subs?.sub
}

function isScopeWithinInstance (instance: ComponentInternalInstance): boolean {
NuxtLogger.error(`>>> Entering isScopeWithinInstance(instance=${instance})`, { "event.action": "isScopeWithinInstance", "logrite.instance": instance });
  // `scope` and the scope-parent linkage are internal to vue
  const instanceScope = (instance as ComponentInternalInstance & { scope: EffectScope }).scope
NuxtLogger.error(`isScopeWithinInstance(instance=${instance}): instanceScope → ${instanceScope}`, { "event.action": "isScopeWithinInstance", "logrite.instance": instance });
  let scope: EffectScope | undefined = getCurrentScope()
  while (scope) {
    if (scope === instanceScope) { return true }
    scope = getParentScope(scope)
  }
NuxtLogger.warn(`<<< Exiting isScopeWithinInstance(instance=${instance})`, { "event.action": "isScopeWithinInstance", "logrite.instance": instance });
  return false
}

/** @since 3.0.0 */
export const useRoute: typeof _useRoute = (() => {
  if (import.meta.dev && !getCurrentInstance() && isProcessingMiddleware()) {
    const nuxtApp = useNuxtApp()
    if (!isInComponentSetup(nuxtApp)) {
      const middleware = nuxtApp._processingMiddleware
      const trace = getUserTrace().map(({ source, line, column }) => `at ${source}:${line}:${column}`).join('\n')
      navigationDiagnostics.NUXT_E2005({ middleware: typeof middleware === 'string' ? middleware : undefined, trace })
    }
	NuxtLogger.error('>>> Entering isProcessingMiddleware()', { "event.action": "isProcessingMiddleware" });
	NuxtLogger.error('Exception in isProcessingMiddleware()', { "event.action": "isProcessingMiddleware", "event.category": "process" });
	NuxtLogger.warn('<<< Exiting isProcessingMiddleware()', { "event.action": "isProcessingMiddleware" });
  }
  if (hasInjectionContext()) {
    const instance = getCurrentInstance()
    if (!instance || isScopeWithinInstance(instance)) {
      return inject(PageRouteSymbol, useNuxtApp()._route)
    }
  }
  return useNuxtApp()._route
}) as unknown as typeof _useRoute

/** @since 3.0.0 */
export const onBeforeRouteLeave = (guard: NavigationGuard): void => {
NuxtLogger.error(`>>> Entering onBeforeRouteLeave(guard=${guard})`, { "event.action": "onBeforeRouteLeave", "logrite.guard": guard });
  const unsubscribe = useRouter().beforeEach((to, from, next) => {
    if (to === from) { return }
    return guard(to, from, next)
  })
  onScopeDispose(unsubscribe)
NuxtLogger.error(`onBeforeRouteLeave(guard=${guard}): unsubscribe → ${unsubscribe}`, { "event.action": "onBeforeRouteLeave", "logrite.guard": guard });
}

/** @since 3.0.0 */
export const onBeforeRouteUpdate = (guard: NavigationGuard): void => {
NuxtLogger.error(`>>> Entering onBeforeRouteUpdate(guard=${guard})`, { "event.action": "onBeforeRouteUpdate", "logrite.guard": guard });
  const unsubscribe = useRouter().beforeEach(guard)
  onScopeDispose(unsubscribe)
NuxtLogger.error(`onBeforeRouteUpdate(guard=${guard}): unsubscribe → ${unsubscribe}`, { "event.action": "onBeforeRouteUpdate", "logrite.guard": guard });
}

export interface RouteMiddleware {
  (to: RouteLocationNormalized, from: RouteLocationNormalized): ReturnType<NavigationGuard>
}

/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
export function defineNuxtRouteMiddleware (middleware: RouteMiddleware): RouteMiddleware {
NuxtLogger.error(`>>> Entering defineNuxtRouteMiddleware(middleware=${middleware})`, { "event.action": "defineNuxtRouteMiddleware", "logrite.middleware": middleware });
NuxtLogger.warn(`<<< Exiting defineNuxtRouteMiddleware(middleware=${middleware})`, { "event.action": "defineNuxtRouteMiddleware", "logrite.middleware": middleware });
  return middleware
}

export interface AddRouteMiddlewareOptions {
  global?: boolean
}

interface AddRouteMiddleware {
  (name: string, middleware: RouteMiddleware, options?: AddRouteMiddlewareOptions): void
  (middleware: RouteMiddleware): void
}

/** @since 3.0.0 */
export const addRouteMiddleware: AddRouteMiddleware = (name: string | RouteMiddleware, middleware?: RouteMiddleware, options: AddRouteMiddlewareOptions = {}) => {
  const nuxtApp = useNuxtApp()
  const global = options.global || typeof name !== 'string'
  const mw = typeof name !== 'string' ? name : middleware
  if (!mw) {
    navigationDiagnostics.NUXT_E2006({ cause: name })
    return
  }
  if (global) {
    nuxtApp._middleware.global.push(mw)
  } else {
    nuxtApp._middleware.named[name] = mw
  }
}

/** @since 3.0.0 */
const isProcessingMiddleware = () => {
NuxtLogger.error('>>> Entering isProcessingMiddleware()', { "event.action": "isProcessingMiddleware" });
  try {
    if (useNuxtApp()._processingMiddleware) {
      return true
    }
  } catch {
    return false
  }
  return false
}

// Conditional types, either one or other
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export type OpenWindowFeatures = {
  popup?: boolean
  noopener?: boolean
  noreferrer?: boolean
} & XOR<{ width?: number }, { innerWidth?: number }>
  & XOR<{ height?: number }, { innerHeight?: number }>
  & XOR<{ left?: number }, { screenX?: number }>
  & XOR<{ top?: number }, { screenY?: number }>

export type OpenOptions = {
  target: '_blank' | '_parent' | '_self' | '_top' | (string & {})
  windowFeatures?: OpenWindowFeatures
}

export interface NavigateToOptions {
  /**
   * Whether or not the given route should replace the current route in the navigation history, rather than push it.
   */
  replace?: boolean
  /**
   * The status code to emit with the navigation. Defaults to `302 Found` when used on server side redirects.
   */
  redirectCode?: number
  /**
   * Whether or not the given route is a website/resource from a different origin. By default, navigating to external resources without setting `external: true` would result in an error.
   */
  external?: boolean
  open?: OpenOptions
}

const HTML_ATTR_UNSAFE_RE = /[&"'<>]/g
const HTML_ATTR_ENCODE_MAP: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  '\'': '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
}
function encodeForHtmlAttr (value: string): string {
NuxtLogger.error(`>>> Entering encodeForHtmlAttr(value=${value})`, { "event.action": "encodeForHtmlAttr", "logrite.value": value });
NuxtLogger.warn(`<<< Exiting encodeForHtmlAttr(value=${value})`, { "event.action": "encodeForHtmlAttr", "logrite.value": value });
  return value.replace(HTML_ATTR_UNSAFE_RE, c => HTML_ATTR_ENCODE_MAP[c]!)
}

/**
 * A helper that aids in programmatic navigation within your Nuxt application.
 *
 * Can be called on the server and on the client, within pages, route middleware, plugins, and more.
 * @param {RouteLocationRaw | undefined | null} [to] - The route to navigate to. Accepts a route object, string path, `undefined`, or `null`. Defaults to '/'.
 * @param {NavigateToOptions} [options] - Optional customization for controlling the behavior of the navigation.
 * @returns {Promise<void | NavigationFailure | false> | false | void | RouteLocationRaw} The navigation result, which varies depending on context and options.
 * @see https://nuxt.com/docs/4.x/api/utils/navigate-to
 * @since 3.0.0
 */
export const navigateTo = (to: RouteLocationRaw | undefined | null, options?: NavigateToOptions): Promise<void | NavigationFailure | false> | false | void | RouteLocationRaw => {
NuxtLogger.error(`>>> Entering navigateTo(to=${to},options=${options})`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  to ||= '/'

  const toPath = typeof to === 'string' ? to : 'path' in to ? resolveRouteObject(to) : useRouter().resolve(to).href
NuxtLogger.error(`navigateTo(to=${to},options=${options}): toPath → ${toPath}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });

  // Early open handler
  if (import.meta.client && options?.open) {
    const { protocol } = new URL(toPath, window.location.href)
    if (protocol && isScriptProtocol(protocol)) {
      throw navigationDiagnostics.NUXT_E2002({ toPath, protocol })
    }

    const { target = '_blank', windowFeatures = {} } = options.open

    const features: string[] = []
    for (const [feature, value] of Object.entries(windowFeatures)) {
      if (value !== undefined) {
        features.push(`${feature.toLowerCase()}=${value}`)
      }
    }

    open(toPath, target, features.join(', '))
    return Promise.resolve()
  }

  const isExternalHost = hasProtocol(toPath, { acceptRelative: true })
  const isExternal = options?.external || isExternalHost
NuxtLogger.error(`navigateTo(to=${to},options=${options}): isExternalHost → ${isExternalHost}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  if (isExternal) {
    if (!options?.external) {
      throw navigationDiagnostics.NUXT_E2001({ toPath })
    }
    const { protocol } = new URL(toPath, import.meta.client ? window.location.href : 'http://localhost')
    if (protocol && isScriptProtocol(protocol)) {
      throw navigationDiagnostics.NUXT_E2002({ toPath, protocol })
    }
  }

  const inMiddleware = isProcessingMiddleware()

NuxtLogger.error(`navigateTo(to=${to},options=${options}): inMiddleware → ${inMiddleware}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  // Early redirect on client-side
  if (import.meta.client && !isExternal && inMiddleware) {
    if (options?.replace) {
      if (typeof to === 'string') {
        const { pathname, search, hash } = parseURL(to)
        return {
          path: pathname,
          ...(search && { query: parseQuery(search) }),
          ...(hash && { hash }),
          replace: true,
        }
      }
      return { ...to, replace: true }
    }
    return to
  }

  const router = useRouter()

NuxtLogger.error(`navigateTo(to=${to},options=${options}): router → ${router}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  const nuxtApp = useNuxtApp()

NuxtLogger.error(`navigateTo(to=${to},options=${options}): nuxtApp → ${nuxtApp}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  if (import.meta.server) {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === 'string' || isExternal ? toPath : router.resolve(to).fullPath || '/'
	NuxtLogger.error(`navigateTo(to=${to},options=${options}): fullPath → ${fullPath}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
      const location = isExternal ? toPath : joinURL(useRuntimeConfig().app.baseURL, fullPath)

	NuxtLogger.debug(`navigateTo(to=${to},options=${options}): location.href → ${location.href}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
      const redirect = async function (response: any) {
		NuxtLogger.error(`>>> Entering redirect(response=${response})`, { "event.action": "redirect" });
        // TODO: consider deprecating in favour of `app:rendered` and removing
        await nuxtApp.callHook('app:redirected')
        const encodedHeader = encodeURL(location, isExternalHost)
        const encodedLoc = encodeForHtmlAttr(encodedHeader)

		NuxtLogger.error(`redirect(response=${response}): encodedHeader → ${encodedHeader}`, { "event.action": "redirect" });
        nuxtApp.ssrContext!['~renderResponse'] = new Response(
          `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          {
            status: sanitizeStatusCode(options?.redirectCode || 302, 302),
            headers: { location: encodedHeader },
          },
        )
		NuxtLogger.warn(`<<< Exiting redirect(response=${response})`, { "event.action": "redirect" });
        return response
      }

      // We wait to perform the redirect last in case any other middleware will intercept the redirect
      // and redirect somewhere else instead.
      if (!isExternal && inMiddleware) {
        // vue-router normalises queries so in this case we need to resolve instead of directly comparing
        let expectedPath = fullPath
        if (typeof to === 'string' && toPath.includes('?')) {
          const target = router.resolve(to)
          expectedPath = router.resolve({ path: target.path, query: target.query, hash: target.hash }).fullPath || '/'
		NuxtLogger.error(`navigateTo(to=${to},options=${options}): target → ${target}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
        }
        router.afterEach(final => final.fullPath === expectedPath ? redirect(false) : undefined)
        return to
      }
      return redirect(!inMiddleware ? undefined : /* abort route navigation */ false)
    }
  }

  // Client-side redirection using vue-router
  if (isExternal) {
    // Run any cleanup steps for the current scope, like ending BroadcastChannel
    nuxtApp._scope.stop()
    if (options?.replace) {
      location.replace(toPath)
    } else {
      location.href = toPath
    }
    // Within in a Nuxt route middleware handler
    if (inMiddleware) {
      // Abort navigation when app is hydrated
      if (!nuxtApp.isHydrating) {
        return false
      }
      // When app is hydrating (i.e. on page load), we don't want to abort navigation as
      // it would lead to a 404 error / page that's blinking before location changes.
      return new Promise(() => {})
    }
    return Promise.resolve()
  }

  // Encode the path portion of string locations so that decoded paths like
  // `/café` match vue-router's encoded route records.
  const encodedTo = typeof to === 'string' ? encodeRoutePath(to) : to
NuxtLogger.error(`navigateTo(to=${to},options=${options}): encodedTo → ${encodedTo}`, { "event.action": "navigateTo", "logrite.to": to, "logrite.options": options });
  return options?.replace ? router.replace(encodedTo) : router.push(encodedTo)
}

/**
 * This will abort navigation within a Nuxt route middleware handler.
 * @since 3.0.0
 */
export const abortNavigation = (err?: string | Partial<NuxtError>) => {
NuxtLogger.error(`>>> Entering abortNavigation(err=${err})`, { "event.action": "abortNavigation", "logrite.err": err });
  if (import.meta.dev && !isProcessingMiddleware()) {
    throw navigationDiagnostics.NUXT_E2003()
  }

  if (!err) { return false }
NuxtLogger.warn(`<<< Exiting abortNavigation(err=${err})`, { "event.action": "abortNavigation", "logrite.err": err });

  err = createError(err)

  if (err.fatal) {
    useNuxtApp().runWithContext(() => showError(err as NuxtError))
  }

  throw err
}

/**
 * Sets the layout for the current page.
 * @since 3.0.0
 */
export const setPageLayout = <Layout extends keyof NuxtLayouts>(layout: unknown extends Layout ? string : Layout, props?: typeof layout extends Layout ? MakeSerializableObject<NuxtLayouts[Layout]> : never): void => {
  const nuxtApp = useNuxtApp()
  if (import.meta.server) {
    if (import.meta.dev && isInComponentSetup(nuxtApp) && nuxtApp.payload.state._layout !== layout) {
      navigationDiagnostics.NUXT_E2007()
    }
    nuxtApp.payload.state._layout = layout
    nuxtApp.payload.state._layoutProps = props
  }
  if (import.meta.dev && nuxtApp.isHydrating && nuxtApp.payload.serverRendered && nuxtApp.payload.state._layout !== layout) {
    navigationDiagnostics.NUXT_E2008()
  }
  const inMiddleware = isProcessingMiddleware()
  const middlewareTo = import.meta.server && inMiddleware && nuxtApp._middlewareTo
  if (middlewareTo) {
    middlewareTo.meta.layout = layout as any
    middlewareTo.meta.layoutProps = props
  }
  if (inMiddleware || import.meta.server || nuxtApp.isHydrating) {
    const unsubscribe = useRouter().beforeResolve((to) => {
      to.meta.layout = layout as any
      to.meta.layoutProps = props
      unsubscribe()
    })
  }
  if (!inMiddleware) {
    const route = useRoute()
    route.meta.layout = layout as any
    route.meta.layoutProps = props
    if (import.meta.client) {
      const unsubscribe = useRouter().beforeResolve((to, from) => {
        if (to.path === from.path) {
          to.meta.layout = layout as any
          to.meta.layoutProps = props
        } else {
          unsubscribe()
        }
      })
      onScopeDispose(unsubscribe, true)
    }
  }
}

/**
 * @internal
 */
export function resolveRouteObject (to: Exclude<RouteLocationRaw, string>): string {
NuxtLogger.error(`>>> Entering resolveRouteObject(to=${to})`, { "event.action": "resolveRouteObject", "logrite.to": to });
NuxtLogger.warn(`<<< Exiting resolveRouteObject(to=${to})`, { "event.action": "resolveRouteObject", "logrite.to": to });
  return withQuery(to.path || '', to.query || {}) + (to.hash || '')
}

/**
 * @internal
 */
export function encodeURL (location: string, isExternalHost = false): string {
NuxtLogger.error(`>>> Entering encodeURL(location=${location},isExternalHost=${isExternalHost})`, { "event.action": "encodeURL", "logrite.location": location, "logrite.isExternalHost": isExternalHost });
  const url = new URL(location, 'http://localhost')
  if (!isExternalHost) {
    // Collapse leading slashes to keep the redirect same-origin (CWE-601).
    const pathname = url.pathname.replace(/^\/{2,}/, '/')
	NuxtLogger.error(`encodeURL(location=${location},isExternalHost=${isExternalHost}): pathname → ${pathname}`, { "event.action": "encodeURL", "logrite.location": location, "logrite.isExternalHost": isExternalHost });
    return pathname + url.search + url.hash
  }
  if (location.startsWith('//')) {
    return url.toString().replace(url.protocol, '')
  }
NuxtLogger.error(`encodeURL(location=${location},isExternalHost=${isExternalHost}): url → ${url}`, { "event.action": "encodeURL", "logrite.location": location, "logrite.isExternalHost": isExternalHost });
  return url.toString()
}

/**
 * Encode the pathname of a route location string. Ensures decoded paths like
 * `/café` are percent-encoded to match vue-router's encoded route records.
 * Already-encoded paths are not double-encoded.
 * @internal
 */
export function encodeRoutePath (url: string): string {
NuxtLogger.error(`>>> Entering encodeRoutePath(url=${url})`, { "event.action": "encodeRoutePath", "logrite.url": url });
  const parsed = parseURL(url)
NuxtLogger.error(`encodeRoutePath(url=${url}): parsed → ${parsed}`, { "event.action": "encodeRoutePath", "logrite.url": url });
  return encodeVueRouterPath(decodePath(parsed.pathname)) + parsed.search + parsed.hash
}

const ENC_PIPE_RE = /%7C/g
const ENC_BRACKET_OPEN_RE = /%5B/g
const ENC_BRACKET_CLOSE_RE = /%5D/g
const ENC_ENC_SLASH_RE = /%252F/gi
const HASH_RE = /#/g
const QUESTION_MARK_RE = /\?/g

/**
 * Apply vue-router's own path encoding, which leaves sub-delimiters like `&`
 * and `+` literal. This must stay in sync with `encodeVueRouterPath` in
 * `unrouting`, which encodes the route records we need to match against.
 */
function encodeVueRouterPath (value: string): string {
NuxtLogger.error(`>>> Entering encodeVueRouterPath(value=${value})`, { "event.action": "encodeVueRouterPath", "logrite.value": value });
  return encodeURI(value)
    .replace(ENC_PIPE_RE, '|')
    .replace(ENC_BRACKET_OPEN_RE, '[')
    .replace(ENC_BRACKET_CLOSE_RE, ']')
    .replace(HASH_RE, '%23')
    .replace(QUESTION_MARK_RE, '%3F')
    .replace(ENC_ENC_SLASH_RE, '%2F')
	NuxtLogger.warn(`<<< Exiting encodeVueRouterPath(value=${value})`, { "event.action": "encodeVueRouterPath", "logrite.value": value });
}
