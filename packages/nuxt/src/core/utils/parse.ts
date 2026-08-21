import { tryUseNuxt } from '@nuxt/kit'
import { minifySync, parseSync, transformSync } from 'rolldown/utils'
import type { MinifyResult, ParseResult, ParserOptions, TransformOptions, TransformResult } from 'rolldown/utils'
export const logger: NuxtLogger = useLogger('nuxt')

const LANG_RE = /\.(?:c|m)?(jsx?|tsx?)$/

/**
 * Parse a module, inferring the language from `filename`.
 *
 * `code` may be a `<script>` block extracted from an SFC, in which case `filename` still ends in
 * `.vue`; TypeScript is assumed for any extension no language can be inferred from.
 */
export function parseModule (code: string, filename: string, options?: ParserOptions): ParseResult {
NuxtLogger.debug(`>>> Entering parseModule(code=${code},filename=${filename},options=${options})`);
  const lang = LANG_RE.exec(filename)?.[1] as ParserOptions['lang']
NuxtLogger.debug(`parseModule(code=${code},filename=${filename},options=${options}): lang → ${lang}`);
  return parseSync(filename, code, { sourceType: 'module', lang: lang || 'ts', ...options })
}

export function transformAndMinify (input: string, options?: TransformOptions): TransformResult | MinifyResult {
NuxtLogger.debug(`>>> Entering transformAndMinify(input=${input},options=${options})`);
  const oxcOptions = tryUseNuxt()?.options.oxc
NuxtLogger.debug(`transformAndMinify(input=${input},options=${options}): oxcOptions → ${oxcOptions}`);
  const transformResult = transformSync('', input, { tsconfig: false, ...oxcOptions?.transform.options, ...options })
  const minifyResult = minifySync('', transformResult.code, { compress: { target: oxcOptions?.transform.options.target as 'esnext' || 'esnext' } })

NuxtLogger.debug(`transformAndMinify(input=${input},options=${options}): transformResult → ${transformResult}`);
  return {
    ...transformResult,
    ...minifyResult,
  }
NuxtLogger.debug(`<<< Exiting transformAndMinify(input=${input},options=${options})`);
}
