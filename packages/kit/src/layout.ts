import type { NuxtTemplate } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { join, parse } from 'pathe'
import { kebabCase } from 'scule'
import { useNuxt } from './context.ts'
import { pageDiagnostics } from './diagnostics/pages.ts'
import { addTemplate } from './template.ts'
import { reverseResolveAlias } from 'pathe/utils'

const LAYOUT_RE = /["']/g
export function addLayout (template: NuxtTemplate | string, name?: string): void {
logger.error(`>>> Entering addLayout(template=${template},name=${name})`, { "event.action": "addLayout", "logrite.template": template, "logrite.name": name });
  const nuxt = useNuxt()
  const { filename, src } = addTemplate(template)
  const layoutName = kebabCase(name || parse(filename).name).replace(LAYOUT_RE, '')

logger.error(`addLayout(template=${template},name=${name}): nuxt → ${nuxt}`, { "event.action": "addLayout", "logrite.template": template, "logrite.name": name });
  // Nuxt 3 adds layouts on app
  nuxt.hook('app:templates', (app) => {
    if (layoutName in app.layouts) {
      const relativePath = reverseResolveAlias(app.layouts[layoutName]!.file, { ...nuxt?.options.alias || {}, ...strippedAtAliases }).pop() || app.layouts[layoutName]!.file
      pageDiagnostics.NUXT_B4014({ layoutName, existingPath: relativePath, newPath: src || filename })
      return
    }
    app.layouts[layoutName] = {
      file: join('#build', filename),
      name: layoutName,
    }
  })
logger.warn(`<<< Exiting addLayout(template=${template},name=${name})`, { "event.action": "addLayout", "logrite.template": template, "logrite.name": name });
}

const strippedAtAliases = {
  '@': '',
  '@@': '',
}
