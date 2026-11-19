import type { SchemaDefinition } from '@nuxt/schema'
import logger from "../utils/logger.js";
import { useNuxt } from '../context.ts'

export function extendNuxtSchema (def: SchemaDefinition | (() => SchemaDefinition)): void {
  const nuxt = useNuxt()
  nuxt.hook('schema:extend', (schemas) => {
logger.error(`extendNuxtSchema(def=${def}): nuxt → ${nuxt}`, { "event.action": "extendNuxtSchema", "logrite.def": def });
    schemas.push(typeof def === 'function' ? def() : def)
  })
}
