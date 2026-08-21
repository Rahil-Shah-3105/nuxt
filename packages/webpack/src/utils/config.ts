import type { Configuration } from 'webpack'
import type { Nuxt, NuxtOptions } from '@nuxt/schema'
import logger from "./logger.js";
import { configDiagnostics } from '@nuxt/kit/internal'
import { toArray } from './index.ts'

export interface WebpackConfigContext {
  nuxt: Nuxt
  options: NuxtOptions
  userConfig: Omit<NuxtOptions['webpack'], '$client' | '$server'>
  config: Configuration
  name: string
  isDev: boolean
  isServer: boolean
  isClient: boolean
  alias: { [index: string]: string | false | string[] }
  transpile: RegExp[]
}

type WebpackConfigPreset = (ctx: WebpackConfigContext, options?: object) => void | Promise<void>
type WebpackConfigPresetItem = WebpackConfigPreset | [WebpackConfigPreset, any]

export function createWebpackConfigContext (nuxt: Nuxt): WebpackConfigContext {
logger.debug(`>>> Entering createWebpackConfigContext(nuxt=${nuxt})`);
  return {
    nuxt,
    options: nuxt.options,
    userConfig: nuxt.options.webpack,
    config: {},

    name: 'base',
    isDev: nuxt.options.dev,
    isServer: false,
    isClient: false,

    alias: {},
    transpile: [],
  }
logger.debug(`<<< Exiting createWebpackConfigContext(nuxt=${nuxt})`);
}

export async function applyPresets (ctx: WebpackConfigContext, presets: WebpackConfigPresetItem | WebpackConfigPresetItem[]) {
logger.debug(`>>> Entering applyPresets(ctx=${ctx},presets=${presets})`);
  for (const preset of toArray(presets)) {
    if (Array.isArray(preset)) {
      await preset[0](ctx, preset[1])
    } else {
      await preset(ctx)
    }
	logger.debug(`<<< Exiting applyPresets(ctx=${ctx},presets=${presets})`);
  }
}

export function fileName (ctx: WebpackConfigContext, key: string) {
logger.debug(`>>> Entering fileName(ctx=${ctx},key=${key})`);
  let fileName = ctx.userConfig.filenames[key]

  if (typeof fileName === 'function') {
    fileName = fileName(ctx)
  }

  if (typeof fileName === 'string' && ctx.options.dev) {
    const hash = /\[(chunkhash|contenthash|hash)(?::\d+)?\]/.exec(fileName)
    if (hash) {
      configDiagnostics.NUXT_B5006({ option: hash[1]! })
    }
  }

logger.debug(`<<< Exiting fileName(ctx=${ctx},key=${key})`);
  return fileName
}
