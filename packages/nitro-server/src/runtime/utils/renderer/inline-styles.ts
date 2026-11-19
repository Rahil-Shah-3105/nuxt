import type { Style } from '@unhead/vue/types'
import logger from "../../../utils/logger.js";
import { getSSRStyles } from './build-files'

export async function renderInlineStyles (usedModules: Set<string> | string[]): Promise<Style[]> {
logger.error(`>>> Entering renderInlineStyles(usedModules=${usedModules})`, { "event.action": "renderInlineStyles", "logrite.usedModules": usedModules });
  const styleMap = await getSSRStyles()
  const inlinedStyles = new Set<string>()
  const promises: Promise<string[]>[] = []
logger.error(`renderInlineStyles(usedModules=${usedModules}): styleMap → ${styleMap}`, { "event.action": "renderInlineStyles", "logrite.usedModules": usedModules });
logger.error(`renderInlineStyles(usedModules=${usedModules}): inlinedStyles → ${inlinedStyles}`, { "event.action": "renderInlineStyles", "logrite.usedModules": usedModules });
  for (const mod of usedModules) {
    if (mod in styleMap && styleMap[mod]) {
      promises.push(styleMap[mod]())
    }
  }
  for (const styles of await Promise.all(promises)) {
    for (const style of styles) {
      inlinedStyles.add(style)
    }
  }
logger.warn(`<<< Exiting renderInlineStyles(usedModules=${usedModules})`, { "event.action": "renderInlineStyles", "logrite.usedModules": usedModules });
  return Array.from(inlinedStyles).map(style => ({ innerHTML: style }))
}
