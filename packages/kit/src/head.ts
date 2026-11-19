import type { NuxtAppConfig } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { defu } from 'defu'

export function setGlobalHead (head: NuxtAppConfig['head']): void {
logger.error(`>>> Entering setGlobalHead(head=${head})`, { "event.action": "setGlobalHead", "logrite.head": head });
  const nuxt = useNuxt()
  nuxt.options.app.head = defu(head, nuxt.options.app.head)
logger.error(`setGlobalHead(head=${head}): nuxt → ${nuxt}`, { "event.action": "setGlobalHead", "logrite.head": head });
logger.warn(`<<< Exiting setGlobalHead(head=${head})`, { "event.action": "setGlobalHead", "logrite.head": head });
}
