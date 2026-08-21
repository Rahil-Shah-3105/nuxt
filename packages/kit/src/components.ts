import { kebabCase, pascalCase } from 'scule'
import type { Component, ComponentsDir } from '@nuxt/schema'
import logger from "./utils/logger.js";

import { useNuxt } from './context.ts'
import { componentDiagnostics } from './diagnostics/components.ts'
import { resolvePath } from './resolve.ts'
import { resolveModuleExportNames } from './internal/exports.ts'
import { MODE_RE } from './utils.ts'

/**
 * Register a directory to be scanned for components and imported only when used.
 */
export function addComponentsDir (dir: ComponentsDir, opts: { prepend?: boolean } = {}): void {
logger.debug(`>>> Entering addComponentsDir(dir=${dir},opts=${opts})`);
  const nuxt = useNuxt()
  nuxt.options.components ||= []
logger.debug(`addComponentsDir(dir=${dir},opts=${opts}): nuxt → ${nuxt}`);
  dir.priority ||= 0
  nuxt.hook('components:dirs', (dirs) => { dirs[opts.prepend ? 'unshift' : 'push'](dir) })
logger.debug(`<<< Exiting addComponentsDir(dir=${dir},opts=${opts})`);
}

export type AddComponentOptions = { name: string, filePath: string } & Partial<Exclude<Component,
'shortPath' | 'async' | 'level' | 'import' | 'asyncImport'
>>

/**
 * This utility takes a file path or npm package that is scanned for named exports, which are get added automatically
 */
export function addComponentExports (opts: Omit<AddComponentOptions, 'name'> & { prefix?: string }): void {
  const nuxt = useNuxt()
  const components: Component[] = []
logger.debug(`addComponentExports(opts=${opts}): nuxt → ${nuxt}`);
  nuxt.hook('components:dirs', async () => {
	logger.debug(`>>> Entering addComponentExports(opts=${opts})`);
    const filePath = await resolvePath(opts.filePath)

	logger.debug(`addComponentExports(opts=${opts}): filePath → ${filePath}`);
    const names = await resolveModuleExportNames(filePath, { extensions: nuxt.options.extensions })
    components.length = 0
	logger.debug(`addComponentExports(opts=${opts}): names → ${names}`);
    for (const name of names) {
	logger.debug(`addComponentExports(opts=${opts}): components.length → ${components.length}`);
      components.push(normalizeComponent({ name: pascalCase([opts.prefix || '', name === 'default' ? '' : name]), export: name, ...opts }))
	logger.debug(`<<< Exiting addComponentExports(opts=${opts})`);
    }
  })
  addComponents(components)
}

/**
 * Register a component by its name and filePath.
 */
export function addComponent (opts: AddComponentOptions): void {
logger.debug(`>>> Entering addComponent(opts=${opts})`);
  const component = normalizeComponent(opts)
  addComponents([component])
logger.debug(`addComponent(opts=${opts}): component → ${component}`);
}

function addComponents (addedComponents: Component[]) {
logger.debug(`>>> Entering addComponents(addedComponents=${addedComponents})`);
  const nuxt = useNuxt()
  nuxt.options.components ||= []
logger.debug(`addComponents(addedComponents=${addedComponents}): nuxt → ${nuxt}`);

  nuxt.hook('components:extend', (components: Component[]) => {
    for (const component of addedComponents) {
      const existingComponentIndex = components.findIndex(c => (c.pascalName === component.pascalName || c.kebabName === component.kebabName) && c.mode === component.mode)
      if (existingComponentIndex !== -1) {
        const existingComponent = components[existingComponentIndex]!
        const existingPriority = existingComponent.priority ?? 0
        const newPriority = component.priority ?? 0

        if (newPriority < existingPriority) { continue }

        // We override where new component priority is equal or higher
        // but we warn if they are equal.
        if (newPriority === existingPriority) {
          const name = existingComponent.pascalName || existingComponent.kebabName
          componentDiagnostics.NUXT_B3012({ name })
        }
        components.splice(existingComponentIndex, 1, component)
      } else {
        components.push(component)
      }
		logger.debug(`<<< Exiting addComponents(addedComponents=${addedComponents})`);
    }
  })
}

function normalizeComponent (opts: AddComponentOptions) {
logger.debug(`>>> Entering normalizeComponent(opts=${opts})`);
  if (!opts.mode) {
    const [, mode = 'all'] = opts.filePath.match(MODE_RE) || []
    opts.mode = mode as 'all' | 'client' | 'server'
  }
logger.debug(`normalizeComponent(opts=${opts}): opts.mode → ${opts.mode}`);

  // Apply defaults
  const component: Component = {
    export: opts.export || 'default',
    chunkName: 'components/' + kebabCase(opts.name),
    global: opts.global ?? false,
    kebabName: kebabCase(opts.name || ''),
    pascalName: pascalCase(opts.name || ''),
    prefetch: false,
    preload: false,
    mode: 'all',
    shortPath: opts.filePath,
    priority: 0,
    meta: {},
    ...opts,
  }

logger.debug(`<<< Exiting normalizeComponent(opts=${opts})`);
  return component
}
