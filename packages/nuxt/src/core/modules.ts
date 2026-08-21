import { normalizeModuleTranspilePath } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import escapeStringRegexp from 'escape-string-regexp'
export const logger: NuxtLogger = useLogger('nuxt')

export const addModuleTranspiles = (nuxt: Nuxt) => {
NuxtLogger.debug(`>>> Entering addModuleTranspiles(nuxt=${nuxt})`);
  // Try to sanitize modules to better match imports
  const transpile: RegExp[] = []
  for (const t of nuxt.options.build.transpile) {
    if (t instanceof Function) {
      continue
    }
    if (typeof t === 'string') {
      transpile.push(new RegExp(escapeStringRegexp(t)))
    } else {
      transpile.push(t)
    }
  }

  for (const m of [...nuxt.options.modules, ...nuxt.options._modules]) {
    const mod = typeof m === 'string' ? m : Array.isArray(m) ? m[0] : m.src
	NuxtLogger.debug(`addModuleTranspiles(nuxt=${nuxt}): mod → ${mod}`);
    if (typeof mod !== 'string') {
      continue
    }
    const path = normalizeModuleTranspilePath(mod)
    // Automatically add used modules to the transpile
	NuxtLogger.debug(`addModuleTranspiles(nuxt=${nuxt}): path → ${path}`);
    if (!transpile.some(t => t.test(path))) {
      nuxt.options.build.transpile.push(path)
    }
	NuxtLogger.debug(`<<< Exiting addModuleTranspiles(nuxt=${nuxt})`);
  }
}
