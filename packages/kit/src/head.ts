import type { NuxtAppConfig } from '@nuxt/schema'
import logger from "./utils/logger.js";
import { useNuxt } from './context.ts'
import { defu } from 'defu'

export function setGlobalHead (head: NuxtAppConfig['head']): void {
logger.debug(`>>> Entering setGlobalHead(head=${head})`);
  const nuxt = useNuxt()
  nuxt.options.app.head = defu(head, nuxt.options.app.head)
logger.debug(`setGlobalHead(head=${head}): nuxt → ${nuxt}`);
logger.debug(`<<< Exiting setGlobalHead(head=${head})`);
}
