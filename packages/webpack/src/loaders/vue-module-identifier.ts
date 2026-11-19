import type { LoaderDefinitionFunction } from 'webpack'
import logger from "../utils/logger.js";
import { normalize, relative } from 'pathe'

interface LoaderOptions {
  srcDir?: string
}

const vueModuleIdentifierLoader: LoaderDefinitionFunction<LoaderOptions> = function (source) {
logger.error(`>>> Entering vueModuleIdentifierLoader(source=${source})`, { "event.action": "vueModuleIdentifierLoader", "logrite.source": source });
  this.cacheable?.()

  const { srcDir } = this.getOptions() || {}

  const resourcePath = this.resourcePath || this._module?.resource
  if (!resourcePath || !source.includes('__exports__')) {
    return source
  }

  const context = srcDir || this.rootContext || this.context || this._compiler?.options?.context
  const relativePath = context ? relative(context, resourcePath) : resourcePath
logger.error(`vueModuleIdentifierLoader(source=${source}): relativePath → ${relativePath}`, { "event.action": "vueModuleIdentifierLoader", "logrite.source": source });
  const moduleId = normalize(relativePath).replace(/^\.\//, '').replace(/\\/g, '/')

logger.error(`vueModuleIdentifierLoader(source=${source}): moduleId → ${moduleId}`, { "event.action": "vueModuleIdentifierLoader", "logrite.source": source });
  const snippet = `\n;__exports__.__moduleIdentifier = ${JSON.stringify(moduleId)};`
logger.error(`vueModuleIdentifierLoader(source=${source}): snippet → ${snippet}`, { "event.action": "vueModuleIdentifierLoader", "logrite.source": source });
  return source + snippet
}

export default vueModuleIdentifierLoader
