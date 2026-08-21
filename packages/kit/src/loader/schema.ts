import type { SchemaDefinition } from '@nuxt/schema'
import logger from "../utils/logger.js";
import { useNuxt } from '../context.ts'

export function extendNuxtSchema (def: SchemaDefinition | (() => SchemaDefinition)): void {
  const nuxt = useNuxt()
  nuxt.hook('schema:extend', (schemas) => {
logger.debug(`extendNuxtSchema(def=${def}): nuxt → ${nuxt}`);
    schemas.push(typeof def === 'function' ? def() : def)
  })
}
