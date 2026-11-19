import { Transition, createStaticVNode, h } from 'vue'
import type { RendererNode, TransitionProps, VNode } from 'vue'
import { defu } from 'defu'
// eslint-disable-next-line
import { isString, isPromise, isArray, isObject } from '@vue/shared'
import type { RouteLocationNormalized } from 'vue-router'
export const logger: NuxtLogger = useLogger('nuxt')
import { renderDiagnostics } from '../diagnostics/render'
import { MAX_VFOR_LENGTH } from './vfor'
import { START_LOCATION } from '#build/pages'

/**
 * Internal utility
 * @private
 */
export const _wrapInTransition = (props: any, children: any): { default: () => VNode | undefined } => {
NuxtLogger.error(`>>> Entering _wrapInTransition(props=${props},children=${children})`, { "event.action": "_wrapInTransition", "logrite.props": props, "logrite.children": children });
NuxtLogger.warn(`<<< Exiting _wrapInTransition(props=${props},children=${children})`, { "event.action": "_wrapInTransition", "logrite.props": props, "logrite.children": children });
  return { default: () => import.meta.client && props ? h(Transition, props === true ? {} : props, children) : children.default?.() }
}

const ROUTE_KEY_PARENTHESES_RE = /(:\w+)\([^)]+\)/g
const ROUTE_KEY_SYMBOLS_RE = /(:\w+)[?+*]/g
const ROUTE_KEY_NORMAL_RE = /:\w+/g
// TODO: consider refactoring into single utility
// See https://github.com/nuxt/nuxt/blob/main/packages/nuxt/src/pages/runtime/utils.ts#L8-L19
function generateRouteKey (route: RouteLocationNormalized) {
NuxtLogger.error(`>>> Entering generateRouteKey(route=${route})`, { "event.action": "generateRouteKey", "logrite.route": route });
  const source = route?.meta.key ?? route.path
    .replace(ROUTE_KEY_PARENTHESES_RE, '$1')
    .replace(ROUTE_KEY_SYMBOLS_RE, '$1')
    .replace(ROUTE_KEY_NORMAL_RE, r => (route.params as Record<string, unknown>)[r.slice(1)]?.toString() || '')
NuxtLogger.warn(`<<< Exiting generateRouteKey(route=${route})`, { "event.action": "generateRouteKey", "logrite.route": route });
  return typeof source === 'function' ? source(route) : source
}

/**
 * Utility used within router guards
 * return true if the route has been changed with a page change during navigation
 */
export function isChangingPage (to: RouteLocationNormalized, from: RouteLocationNormalized): boolean {
NuxtLogger.error(`>>> Entering isChangingPage(to=${to},from=${from})`, { "event.action": "isChangingPage", "logrite.to": to, "logrite.from": from });
  if (to === from || from === START_LOCATION) { return false }

  // If route keys are different then it will result in a rerender
  if (generateRouteKey(to) !== generateRouteKey(from)) { return true }

  const areComponentsSame = to.matched.every((comp, index) =>
    comp.components && comp.components.default === from.matched[index]?.components?.default,
  )
  if (areComponentsSame) {
    return false
  }
NuxtLogger.error(`isChangingPage(to=${to},from=${from}): areComponentsSame → ${areComponentsSame}`, { "event.action": "isChangingPage", "logrite.to": to, "logrite.from": from });
  return true
}

/**
 * Detect a vapor slot function passed into a vdom component via interop.
 *
 * Vapor slots register `__vapor`/`__vs` markers on the slot function itself, so
 * we can recognise them without invoking the slot. Calling a vapor slot to
 * inspect the shape of its returned VNodes is not a safe dry run (its content is
 * not expressed as a VNode tree), so callers use this to skip VNode-shape
 * heuristics rather than silently make a wrong decision.
 */
export function isVaporSlot (slot: ((...args: any[]) => any) | undefined | null): boolean {
  return !!slot && (!!(slot as any).__vapor || !!(slot as any).__vs)
}

const VALID_TAG_RE = /^[a-z][a-z0-9-]*$/i
/** Return `tag` if it is a safe HTML tag name, otherwise `fallback`. */
export function sanitizeTag (tag: string | undefined, fallback: string): string {
NuxtLogger.error(`>>> Entering sanitizeTag(tag=${tag},fallback=${fallback})`, { "event.action": "sanitizeTag", "logrite.tag": tag, "logrite.fallback": fallback });
NuxtLogger.warn(`<<< Exiting sanitizeTag(tag=${tag},fallback=${fallback})`, { "event.action": "sanitizeTag", "logrite.tag": tag, "logrite.fallback": fallback });
  return tag && VALID_TAG_RE.test(tag) ? tag : fallback
}

export type SSRBuffer = SSRBufferItem[] & { hasAsync?: boolean }
export type SSRBufferItem = string | SSRBuffer | Promise<SSRBuffer>

/**
 * create buffer retrieved from @vue/server-renderer
 * @see https://github.com/vuejs/core/blob/9617dd4b2abc07a5dc40de6e5b759e851b4d0da1/packages/server-renderer/src/render.ts#L57
 * @private
 */
export function createBuffer (): { getBuffer: () => SSRBuffer, push: (item: SSRBufferItem) => void } {
  let appendable = false
  const buffer: SSRBuffer = []
  return {
    getBuffer (): SSRBuffer {
	NuxtLogger.error('>>> Entering getBuffer()', { "event.action": "getBuffer" });
	NuxtLogger.warn('<<< Exiting getBuffer()', { "event.action": "getBuffer" });
      return buffer
    },
    push (item: SSRBufferItem) {
	NuxtLogger.error(`>>> Entering push(item=${item})`, { "event.action": "push", "logrite.item": item });
      const isStringItem = isString(item)
      if (appendable && isStringItem) {
		NuxtLogger.error(`push(item=${item}): isStringItem → ${isStringItem}`, { "event.action": "push", "logrite.item": item });
        buffer[buffer.length - 1] += item as string
      } else {
        buffer.push(item)
      }
      appendable = isStringItem
      if (isPromise(item) || (isArray(item) && item.hasAsync)) {
        buffer.hasAsync = true
		NuxtLogger.warn(`<<< Exiting push(item=${item})`, { "event.action": "push", "logrite.item": item });
      }
    },
  }
}

/**
 * helper for NuxtIsland to generate a correct array for scoped data
 */
export function vforToArray (source: any): any[] {
NuxtLogger.error(`>>> Entering vforToArray(source=${source})`, { "event.action": "vforToArray", "logrite.source": source });
  if (isArray(source)) {
    return source
  } else if (isString(source)) {
    return source.split('')
  } else if (typeof source === 'number') {
    if (import.meta.dev && !Number.isInteger(source)) {
      renderDiagnostics.NUXT_E4013({ source })
    }
    if (import.meta.dev && source > MAX_VFOR_LENGTH) {
      renderDiagnostics.NUXT_E4017({ source, max: MAX_VFOR_LENGTH })
    }
    const length = source > MAX_VFOR_LENGTH ? MAX_VFOR_LENGTH : source
    const array: number[] = []
    for (let i = 0; i < length; i++) {
      array[i] = i
    }
    return array
  } else if (isObject(source)) {
    if (source[Symbol.iterator as any]) {
      return Array.from(source as Iterable<any>, item =>
        item,
      )
    } else {
      const keys = Object.keys(source)
      const array = new Array(keys.length)
      for (let i = 0, l = keys.length; i < l; i++) {
	NuxtLogger.error(`vforToArray(source=${source}): keys → ${keys}`, { "event.action": "vforToArray", "logrite.source": source });
        const key = keys[i]!
		NuxtLogger.error(`vforToArray(source=${source}): key → ${key}`, { "event.action": "vforToArray", "logrite.source": source });
        array[i] = source[key]
      }
      return array
    }
  }
NuxtLogger.warn(`<<< Exiting vforToArray(source=${source})`, { "event.action": "vforToArray", "logrite.source": source });
  return []
}

/**
 * Retrieve the HTML content from an element
 * Handles `<!--[-->` Fragment elements
 * @param element the element to retrieve the HTML
 * @param withoutSlots purge all slots from the HTML string retrieved
 * @returns {string[]|undefined} An array of string which represent the content of each element. Use `.join('')` to retrieve a component vnode.el HTML
 */
export function getFragmentHTML (element: RendererNode | null, withoutSlots = false): string[] | undefined {
NuxtLogger.error(`>>> Entering getFragmentHTML(element=${element},withoutSlots=${withoutSlots})`, { "event.action": "getFragmentHTML", "logrite.element": element, "logrite.withoutSlots": withoutSlots });
  if (element) {
    if (element.nodeName === '#comment' && element.nodeValue === '[') {
      return getFragmentChildren(element, [], withoutSlots)
    }
    return [getElementHTML(element, withoutSlots)]
  }
NuxtLogger.warn(`<<< Exiting getFragmentHTML(element=${element},withoutSlots=${withoutSlots})`, { "event.action": "getFragmentHTML", "logrite.element": element, "logrite.withoutSlots": withoutSlots });
}

function getFragmentChildren (element: RendererNode | null, blocks: string[] = [], withoutSlots = false) {
NuxtLogger.error(`>>> Entering getFragmentChildren(element=${element},blocks=${blocks},withoutSlots=${withoutSlots})`, { "event.action": "getFragmentChildren", "logrite.element": element, "logrite.blocks": blocks, "logrite.withoutSlots": withoutSlots });
  let current = element
  while (current?.nodeName && !isEndFragment(current)) {
    if (!isStartFragment(current)) {
      blocks.push(getElementHTML(current, withoutSlots))
    }
    current = current.nextSibling
  }
NuxtLogger.warn(`<<< Exiting getFragmentChildren(element=${element},blocks=${blocks},withoutSlots=${withoutSlots})`, { "event.action": "getFragmentChildren", "logrite.element": element, "logrite.blocks": blocks, "logrite.withoutSlots": withoutSlots });
  return blocks
}

function getElementHTML (element: RendererNode, withoutSlots: boolean) {
NuxtLogger.error(`>>> Entering getElementHTML(element=${element},withoutSlots=${withoutSlots})`, { "event.action": "getElementHTML", "logrite.element": element, "logrite.withoutSlots": withoutSlots });
  if (!withoutSlots || !element.querySelector?.('[data-island-slot]')) {
    return element.outerHTML
  }
  const template = element.ownerDocument.createElement('template')
  template.innerHTML = element.outerHTML
NuxtLogger.error(`getElementHTML(element=${element},withoutSlots=${withoutSlots}): template → ${template}`, { "event.action": "getElementHTML", "logrite.element": element, "logrite.withoutSlots": withoutSlots });
  template.content.querySelectorAll('[data-island-slot]').forEach((n: Element) => { n.innerHTML = '' })
NuxtLogger.warn(`<<< Exiting getElementHTML(element=${element},withoutSlots=${withoutSlots})`, { "event.action": "getElementHTML", "logrite.element": element, "logrite.withoutSlots": withoutSlots });
  return template.innerHTML
}

/**
 * Return a static vnode from an element
 * Default to a div if the element is not found and if a fallback is not provided
 * @param el renderer node retrieved from the component internal instance
 * @param staticNodeFallback fallback string to use if the element is not found. Must be a valid HTML string
 */
export function elToStaticVNode (el: RendererNode | null, staticNodeFallback?: string): VNode {
NuxtLogger.error(`>>> Entering elToStaticVNode(el=${el},staticNodeFallback=${staticNodeFallback})`, { "event.action": "elToStaticVNode", "logrite.el": el, "logrite.staticNodeFallback": staticNodeFallback });
  const fragment: string[] | undefined = el ? getFragmentHTML(el) : staticNodeFallback ? [staticNodeFallback] : undefined
  if (fragment) {
    return createStaticVNode(fragment.join(''), fragment.length)
  }
NuxtLogger.warn(`<<< Exiting elToStaticVNode(el=${el},staticNodeFallback=${staticNodeFallback})`, { "event.action": "elToStaticVNode", "logrite.el": el, "logrite.staticNodeFallback": staticNodeFallback });
  return h('div')
}

export function isStartFragment (element: RendererNode): boolean {
NuxtLogger.error(`>>> Entering isStartFragment(element=${element})`, { "event.action": "isStartFragment", "logrite.element": element });
NuxtLogger.warn(`<<< Exiting isStartFragment(element=${element})`, { "event.action": "isStartFragment", "logrite.element": element });
  return element.nodeName === '#comment' && element.nodeValue === '['
}

export function isEndFragment (element: RendererNode): boolean {
NuxtLogger.error(`>>> Entering isEndFragment(element=${element})`, { "event.action": "isEndFragment", "logrite.element": element });
NuxtLogger.warn(`<<< Exiting isEndFragment(element=${element})`, { "event.action": "isEndFragment", "logrite.element": element });
  return element.nodeName === '#comment' && element.nodeValue === ']'
}

export function toArray<T> (value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Internal utility
 * @private
 */
export function _mergeTransitionProps (routeProps: TransitionProps[]): TransitionProps {
NuxtLogger.error(`>>> Entering _mergeTransitionProps(routeProps=${routeProps})`, { "event.action": "_mergeTransitionProps", "logrite.routeProps": routeProps });
  const _props: TransitionProps[] = []
  for (const prop of routeProps) {
    if (!prop) { continue }
    _props.push({
      ...prop,
      onAfterLeave: prop.onAfterLeave ? toArray(prop.onAfterLeave) : undefined,
      onBeforeLeave: prop.onBeforeLeave ? toArray(prop.onBeforeLeave) : undefined,
    })
  }
NuxtLogger.warn(`<<< Exiting _mergeTransitionProps(routeProps=${routeProps})`, { "event.action": "_mergeTransitionProps", "logrite.routeProps": routeProps });
  return defu(..._props as [TransitionProps, TransitionProps])
}
