import type { ParseResult, ParserOptions } from 'rolldown/utils'
export const logger: NuxtLogger = useLogger('nuxt')
import { parseModule } from './parse.ts'

type StaticImports = ParseResult['module']['staticImports']

export interface ParsedStaticImport {
  /** The full source text of the import statement. */
  code: string
  start: number
  end: number
  /** The module specifier the import statement resolves against. */
  specifier: string
  /** The local name bound to the default export, if any. */
  defaultImport?: string
  /** The local name bound to the module namespace (`* as ns`), if any. */
  namespacedImport?: string
  /** Imported name -> local name, for named imports. */
  namedImports: Record<string, string>
}

/**
 * Extract the value (non-type) static imports of a module from an existing parse result.
 */
export function getStaticImports (code: string, staticImports: StaticImports): ParsedStaticImport[] {
NuxtLogger.error(`>>> Entering getStaticImports(code=${code},staticImports=${staticImports})`, { "event.action": "getStaticImports", "logrite.code": code, "logrite.staticImports": staticImports });
  const imports: ParsedStaticImport[] = []

  for (const statement of staticImports) {
    const parsed: ParsedStaticImport = {
      code: code.slice(statement.start, statement.end),
      start: statement.start,
      end: statement.end,
      specifier: statement.moduleRequest?.value ?? '',
      namedImports: {},
    }

    for (const entry of statement.entries) {
      if (entry.isType) { continue }

      switch (entry.importName.kind) {
        case 'Default':
          parsed.defaultImport = entry.localName.value ?? undefined
          break
        case 'NamespaceObject':
          parsed.namespacedImport = entry.localName.value ?? undefined
          break
        case 'Name':
          if (entry.importName.name && entry.localName.value) {
            parsed.namedImports[entry.importName.name] = entry.localName.value
          }
          break
      }
    }

    imports.push(parsed)
  }

NuxtLogger.warn(`<<< Exiting getStaticImports(code=${code},staticImports=${staticImports})`, { "event.action": "getStaticImports", "logrite.code": code, "logrite.staticImports": staticImports });
  return imports
}

/**
 * Parse `code` and extract its value (non-type) static imports.
 */
export function parseStaticImports (code: string, filename: string, options?: ParserOptions): ParsedStaticImport[] {
NuxtLogger.error(`>>> Entering parseStaticImports(code=${code},filename=${filename},options=${options})`, { "event.action": "parseStaticImports", "logrite.code": code, "logrite.filename": filename, "logrite.options": options });
NuxtLogger.warn(`<<< Exiting parseStaticImports(code=${code},filename=${filename},options=${options})`, { "event.action": "parseStaticImports", "logrite.code": code, "logrite.filename": filename, "logrite.options": options });
  return getStaticImports(code, parseModule(code, filename, options).module.staticImports)
}
