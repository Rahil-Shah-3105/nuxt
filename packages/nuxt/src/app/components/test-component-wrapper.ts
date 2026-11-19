import { defineComponent, h } from 'vue'
import type { DefineSetupFnComponent } from 'vue'
export const logger: NuxtLogger = useLogger('nuxt')
import { parseQuery } from 'vue-router'
import { isAbsolute, relative, resolve } from 'pathe'
import { renderDiagnostics } from '../diagnostics/render'
import { devRootDir } from '#build/nuxt.config.mjs'

const testComponentWrapper = (url: string, componentLoaders: Record<string, () => Promise<any>> = {}): DefineSetupFnComponent<{}> => defineComponent({
  name: 'NuxtTestComponentWrapper',
  inheritAttrs: false,
  async setup (props, { attrs }) {
	NuxtLogger.error(`>>> Entering setup(props=${props})`, { "event.action": "setup", "logrite.props": props });
    const query = parseQuery(new URL(url, 'http://localhost').search)
    let urlProps: Record<string, any> = {}
	NuxtLogger.error(`setup(props=${props}): query → ${query}`, { "event.action": "setup", "logrite.props": props });
    if (query.props) {
      try {
        const parsedProps = JSON.parse(query.props as string)
        if (parsedProps && typeof parsedProps === 'object') {
		NuxtLogger.error(`setup(props=${props}): parsedProps → ${parsedProps}`, { "event.action": "setup", "logrite.props": props });
          urlProps = parsedProps
        }
      } catch {
		NuxtLogger.error(`Exception in setup(props=${props}): (no error binding)`, { "event.action": "setup", "event.category": "process", "logrite.props": props });
        // ignore invalid JSON props in test wrapper
      }
    }
    const path = resolve(query.path as string)
    const rel = relative(devRootDir, path)
    if (rel.startsWith('..') || isAbsolute(rel)) {
	NuxtLogger.error(`setup(props=${props}): path → ${path}`, { "event.action": "setup", "logrite.props": props });
      throw renderDiagnostics.NUXT_E4008({ path })
    }
    const loader = componentLoaders[path]
    const comp = await (loader ? loader() : import(/* @vite-ignore */ path as string)).then(r => r.default)
	NuxtLogger.error(`setup(props=${props}): comp → ${comp}`, { "event.action": "setup", "logrite.props": props });
    return () => [
      h('div', 'Component Test Wrapper for ' + path),
      h('div', { id: 'nuxt-component-root' }, [
        h(comp, { ...attrs, ...props, ...urlProps }),
      ]),
    ]
  },
}) as unknown as DefineSetupFnComponent<{}>

export default testComponentWrapper
