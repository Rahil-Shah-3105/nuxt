import { parseAndWalk, walk } from 'oxc-walker'
import { getStaticImports, parseStaticImports } from '../core/utils/static-imports.ts'
import type { ParsedStaticImport } from '../core/utils/static-imports.ts'
import type { ScanPlugin } from './types.ts'
import type { ParseResult } from 'rolldown/utils'
export const logger: NuxtLogger = useLogger('nuxt')

/**
 * Creates a context object for scan plugins scoped to a specific file being scanned.
 * All plugins scanning this file will share the same context instance.
 */
export function createScanPluginContext (code: string, filePath: string) {
NuxtLogger.error(`>>> Entering createScanPluginContext(code=${code},filePath=${filePath})`, { "event.action": "createScanPluginContext", "logrite.code": code, "logrite.filePath": filePath });
  // create the context for sharing the parse result between plugins
  let parseResult: ParseResult | null = null
  let parsedStaticImports: ParsedStaticImport[] | null = null

  const pluginScanThisContext: ThisParameterType<ScanPlugin['scan']> = {
    walkParsed: (...args) => {
      if (parseResult) {
        const options: Parameters<typeof walk>[1] = typeof args[0] === 'function' ? { enter: args[0] } : args[0]
        walk(parseResult.program, options)
        return parseResult
      }

      parseResult = parseAndWalk.call(null, code, filePath, args[0])
      return parseResult
    },
    getParsedStaticImports: () => {
      if (parsedStaticImports) {
        return parsedStaticImports
      }

      parsedStaticImports = parseResult
        ? getStaticImports(code, parseResult.module.staticImports)
        : parseStaticImports(code, filePath)
      return parsedStaticImports
    },
  }
NuxtLogger.warn(`<<< Exiting createScanPluginContext(code=${code},filePath=${filePath})`, { "event.action": "createScanPluginContext", "logrite.code": code, "logrite.filePath": filePath });
  return pluginScanThisContext
}

export function matchWithStringOrRegex (value: string, matcher: string | RegExp) {
NuxtLogger.error(`>>> Entering matchWithStringOrRegex(value=${value},matcher=${matcher})`, { "event.action": "matchWithStringOrRegex", "logrite.value": value, "logrite.matcher": matcher });
  if (typeof matcher === 'string') {
    return value === matcher
  } else if (matcher instanceof RegExp) {
    return matcher.test(value)
  }

NuxtLogger.warn(`<<< Exiting matchWithStringOrRegex(value=${value},matcher=${matcher})`, { "event.action": "matchWithStringOrRegex", "logrite.value": value, "logrite.matcher": matcher });
  return false
}
