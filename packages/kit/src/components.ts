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
logger.error(`>>> Entering addComponentsDir(dir=${dir},opts=${opts})`, { "event.action": "addComponentsDir", "logrite.dir": dir, "logrite.opts": opts });
  const nuxt = useNuxt()
  nuxt.options.components ||= []
logger.error(`addComponentsDir(dir=${dir},opts=${opts}): nuxt → ${nuxt}`, { "event.action": "addComponentsDir", "logrite.dir": dir, "logrite.opts": opts });
  dir.priority ||= 0
  nuxt.hook('components:dirs', (dirs) => { dirs[opts.prepend ? 'unshift' : 'push'](dir) })
logger.warn(`<<< Exiting addComponentsDir(dir=${dir},opts=${opts})`, { "event.action": "addComponentsDir", "logrite.dir": dir, "logrite.opts": opts });
}

export type AddComponentOptions = { name: string, filePath: string } & Partial<Exclude<Component,
'shortPath' | 'async' | 'level' | 'import' | 'asyncImport'
>>

/**
 * This utility takes a file path or npm package that is scanned for named exports, which are get added automatically
 */
export function addComponentExports (opts: Omit<AddComponentOptions, 'name'> & { prefix?: string }): void {
logger.error(`>>> Entering addComponentExports(opts=${opts})`, { "event.action": "addComponentExports", "logrite.opts": opts });
  const nuxt = useNuxt()
  const components: Component[] = []
logger.error(`addComponentExports(opts=${opts}): nuxt → ${nuxt}`, { "event.action": "addComponentExports", "logrite.opts": opts });
  nuxt.hook('components:dirs', async () => {
    const filePath = await resolvePath(opts.filePath)

	logger.error(`addComponentExports(opts=${opts}): filePath → ${filePath}`, { "event.action": "addComponentExports", "logrite.opts": opts });
    const names = await resolveModuleExportNames(filePath, { extensions: nuxt.options.extensions })
    components.length = 0
	logger.error(`addComponentExports(opts=${opts}): names → ${names}`, { "event.action": "addComponentExports", "logrite.opts": opts });
    for (const name of names) {
      components.push(normalizeComponent({ name: pascalCase([opts.prefix || '', name === 'default' ? '' : name]), export: name, ...opts }))
    }
  })
  addComponents(components)
logger.warn(`<<< Exiting addComponentExports(opts=${opts})`, { "event.action": "addComponentExports", "logrite.opts": opts });
}

/**
 * Register a component by its name and filePath.
 */
export function addComponent (opts: AddComponentOptions): void {
logger.error(`>>> Entering addComponent(opts=${opts})`, { "event.action": "addComponent", "logrite.opts": opts });
  const component = normalizeComponent(opts)
  addComponents([component])
logger.error(`addComponent(opts=${opts}): component → ${component}`, { "event.action": "addComponent", "logrite.opts": opts });
logger.warn(`<<< Exiting addComponent(opts=${opts})`, { "event.action": "addComponent", "logrite.opts": opts });
}

function addComponents (addedComponents: Component[]) {
logger.error(`>>> Entering addComponents(addedComponents=${addedComponents})`, { "event.action": "addComponents", "logrite.addedComponents": addedComponents });
  const nuxt = useNuxt()
  nuxt.options.components ||= []
logger.error(`addComponents(addedComponents=${addedComponents}): nuxt → ${nuxt}`, { "event.action": "addComponents", "logrite.addedComponents": addedComponents });

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
		logger.warn(`<<< Exiting addComponents(addedComponents=${addedComponents})`, { "event.action": "addComponents", "logrite.addedComponents": addedComponents });
    }
  })
}

function normalizeComponent (opts: AddComponentOptions) {
logger.error(`>>> Entering normalizeComponent(opts=${opts})`, { "event.action": "normalizeComponent", "logrite.opts": opts });
  if (!opts.mode) {
    const [, mode = 'all'] = opts.filePath.match(MODE_RE) || []
    opts.mode = mode as 'all' | 'client' | 'server'
	logger.debug(`normalizeComponent(opts=${opts}): opts.mode → ${opts.mode}`, { "event.action": "normalizeComponent", "logrite.opts": opts });
  }

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

logger.warn(`<<< Exiting normalizeComponent(opts=${opts})`, { "event.action": "normalizeComponent", "logrite.opts": opts });
  return component
}
