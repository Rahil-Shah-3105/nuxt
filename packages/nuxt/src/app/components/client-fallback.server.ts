import { defineComponent, getCurrentInstance, onErrorCaptured, shallowRef, useId } from 'vue'
import type { DefineSetupFnComponent, SlotsType, VNode } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { ssrInterpolate, ssrRenderAttrs, ssrRenderSlot, ssrRenderVNode } from 'vue/server-renderer'

import { isPromise } from '@vue/shared'
import { useState } from '../composables/state'
import { createBuffer, isVaporSlot, sanitizeTag } from './utils'
import { renderDiagnostics } from '../diagnostics/render'
import { vapor } from '#build/nuxt.config.mjs'

interface NuxtClientFallbackProps {
  fallbackTag?: string
  fallback?: string
  placeholder?: string
  placeholderTag?: string
  keepFallback?: boolean
}

type NuxtClientFallbackEmits = {
  'ssr-error': (error: unknown) => void
}

type NuxtClientFallbackSlots = SlotsType<{
  default?: () => VNode[]
  fallback?: () => VNode[]
  placeholder?: () => VNode[]
}>

const NuxtClientFallbackServer = defineComponent({
  name: 'NuxtClientFallback',
  inheritAttrs: false,
  props: {
    fallbackTag: {
      type: String,
      default: () => 'div',
    },
    fallback: {
      type: String,
      default: () => '',
    },
    placeholder: {
      type: String,
    },
    placeholderTag: {
      type: String,
    },
    keepFallback: {
      type: Boolean,
      default: () => false,
    },
  },
  emits: {
    'ssr-error' (_error: unknown) {
	NuxtLogger.debug(`>>> Entering ssr-error(_error=${_error})`);
	NuxtLogger.debug(`<<< Exiting ssr-error(_error=${_error})`);
      return true
    },
  },
  async setup (_, ctx) {
	NuxtLogger.debug(`>>> Entering setup(_=${_},ctx=${ctx})`);
    const vm = getCurrentInstance()
    const ssrFailed = shallowRef(false)
    const error = useState<boolean | undefined>(useId())

	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): vm → ${vm}`);
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): ssrFailed → ${ssrFailed}`);
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): error → ${error}`);
    onErrorCaptured((err) => {
      error.value = true
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): error.value → ${error.value}`);
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): ssrFailed.value → ${ssrFailed.value}`);
      ssrFailed.value = true
      ctx.emit('ssr-error', err)
      return false
    })

    try {
      if (vapor && isVaporSlot(ctx.slots.default)) {
        if (import.meta.dev) {
          renderDiagnostics.NUXT_E4020()
        }
        error.value = true
        return { ssrFailed: true, ssrVNodes: [] }
      }
      const defaultSlot = ctx.slots.default?.()
      const ssrVNodes = createBuffer()

	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): defaultSlot → ${defaultSlot}`);
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): ssrVNodes → ${ssrVNodes}`);
      if (defaultSlot) {
        for (let i = 0; i < defaultSlot.length; i++) {
          ssrRenderVNode(ssrVNodes.push, defaultSlot[i]!, vm!)
        }
      }

      const buffer = ssrVNodes.getBuffer()
      if (buffer.hasAsync) {
	NuxtLogger.debug(`setup(_=${_},ctx=${ctx}): buffer → ${buffer}`);
        await Promise.all((buffer as unknown[]).flat(Infinity).filter(isPromise))
      }

      return { ssrFailed, ssrVNodes }
    } catch (ssrError) {
	NuxtLogger.error(`Exception in setup(_=${_},ctx=${ctx}): ${(ssrError as Error).message}`, ssrError);
      if (import.meta.dev) {
        renderDiagnostics.NUXT_E4006({ cause: ssrError })
      }
      error.value = true
      ctx.emit('ssr-error', ssrError)
	NuxtLogger.debug(`<<< Exiting setup(_=${_},ctx=${ctx})`);
      return { ssrFailed: true, ssrVNodes: [] }
    }
  },
  ssrRender (ctx: any, push: any, parent: any) {
	NuxtLogger.debug(`>>> Entering ssrRender(ctx=${ctx},push=${push},parent=${parent})`);
    if (ctx.ssrFailed) {
      const { fallback, placeholder } = ctx.$slots
      if (fallback || placeholder) {
        ssrRenderSlot(ctx.$slots, fallback ? 'fallback' : 'placeholder', {}, null, push, parent)
      } else {
        const content = ctx.placeholder || ctx.fallback
        const tag = sanitizeTag(ctx.placeholderTag || ctx.fallbackTag, 'div')
        push(`<${tag}${ssrRenderAttrs(ctx.$attrs)}>${ssrInterpolate(content)}</${tag}>`)
      }
    } else {
      // push Fragment markup
      push('<!--[-->')
      push(ctx.ssrVNodes.getBuffer())
      push('<!--]-->')
    }
	NuxtLogger.debug(`<<< Exiting ssrRender(ctx=${ctx},push=${push},parent=${parent})`);
  },
}) as unknown as DefineSetupFnComponent<NuxtClientFallbackProps, NuxtClientFallbackEmits, NuxtClientFallbackSlots>

export default NuxtClientFallbackServer
