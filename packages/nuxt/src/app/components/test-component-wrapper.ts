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
	NuxtLogger.debug(`>>> Entering setup(props=${props},attrs=${attrs})`);
    const query = parseQuery(new URL(url, 'http://localhost').search)
    let urlProps: Record<string, any> = {}
	NuxtLogger.debug(`setup(props=${props},attrs=${attrs}): query → ${query}`);
    if (query.props) {
      try {
        const parsedProps = JSON.parse(query.props as string)
        if (parsedProps && typeof parsedProps === 'object') {
		NuxtLogger.debug(`setup(props=${props},attrs=${attrs}): parsedProps → ${parsedProps}`);
          urlProps = parsedProps
        }
      } catch {
		NuxtLogger.error(`Exception in setup(props=${props},attrs=${attrs}): (no error binding)`);
        // ignore invalid JSON props in test wrapper
      }
    }
    const path = resolve(query.path as string)
    const rel = relative(devRootDir, path)
    if (rel.startsWith('..') || isAbsolute(rel)) {
	NuxtLogger.debug(`setup(props=${props},attrs=${attrs}): path → ${path}`);
	NuxtLogger.debug(`setup(props=${props},attrs=${attrs}): rel → ${rel}`);
      throw renderDiagnostics.NUXT_E4008({ path })
    }
    const loader = componentLoaders[path]
    const comp = await (loader ? loader() : import(/* @vite-ignore */ path as string)).then(r => r.default)
	NuxtLogger.debug(`setup(props=${props},attrs=${attrs}): comp → ${comp}`);
	NuxtLogger.debug(`<<< Exiting setup(props=${props},attrs=${attrs})`);
    return () => [
      h('div', 'Component Test Wrapper for ' + path),
      h('div', { id: 'nuxt-component-root' }, [
        h(comp, { ...attrs, ...props, ...urlProps }),
      ]),
    ]
  },
}) as unknown as DefineSetupFnComponent<{}>

export default testComponentWrapper
