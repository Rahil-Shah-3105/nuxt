import type { Style } from '@unhead/vue/types'
import logger from "../../../utils/logger.js";
import { getSSRStyles } from './build-files'

export async function renderInlineStyles (usedModules: Set<string> | string[]): Promise<Style[]> {
  const styleMap = await getSSRStyles()
  const inlinedStyles = new Set<string>()
  const promises: Promise<string[]>[] = []
logger.debug(`renderInlineStyles(usedModules=${usedModules}): styleMap → ${styleMap}`);
logger.debug(`renderInlineStyles(usedModules=${usedModules}): inlinedStyles → ${inlinedStyles}`);
  for (const mod of usedModules) {
	logger.debug(`>>> Entering renderInlineStyles(usedModules=${usedModules})`);
    if (mod in styleMap && styleMap[mod]) {
      promises.push(styleMap[mod]())
	logger.debug(`<<< Exiting renderInlineStyles(usedModules=${usedModules})`);
    }
  }
  for (const styles of await Promise.all(promises)) {
    for (const style of styles) {
      inlinedStyles.add(style)
    }
  }
  return Array.from(inlinedStyles).map(style => ({ innerHTML: style }))
}
