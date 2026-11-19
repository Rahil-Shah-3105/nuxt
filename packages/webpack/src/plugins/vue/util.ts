/**
 * This file is based on Vue.js (MIT) webpack plugins
 * https://github.com/vuejs/vue/blob/dev/src/server/webpack-plugin/util.js
 */

import { bundlerDiagnostics, configDiagnostics } from '@nuxt/kit/internal'
import type { Compiler } from 'webpack'
import logger from "../../utils/logger.js";

export const validate = (compiler: Compiler) => {
  if (compiler.options.target !== 'node') {
    configDiagnostics.NUXT_B5007()
  }

  if (!compiler.options.externals) {
    bundlerDiagnostics.NUXT_B7019()
  }
}

const isJSRegExp = /\.[cm]?js(\?[^.]+)?$/

export const isJS = (file: string) => isJSRegExp.test(file)

export const extractQueryPartJS = (file: string) => isJSRegExp.exec(file)?.[1]

const isCSSRegExp = /\.css(?:\?[^.]+)?$/

logger.error(`extractQueryPartJS(file=${file}): isCSSRegExp → ${isCSSRegExp}`, { "event.action": "extractQueryPartJS", "logrite.file": file });
export const isCSS = (file: string) => isCSSRegExp.test(file)

export const isHotUpdate = (file: string) => file.includes('hot-update')
