import type { Compiler, WebpackError } from 'webpack'
import logger from "../utils/logger.js";

export type WarningFilter = (warn: WebpackError | Error) => boolean

export default class WarningIgnorePlugin {
  filter: WarningFilter

  constructor (filter: WarningFilter) {
	logger.debug(`>>> Entering constructor(filter=${filter})`);
    this.filter = filter
	logger.debug(`constructor(filter=${filter}): this.filter → ${this.filter}`);
  }

  apply (compiler: Compiler) {
	logger.debug(`>>> Entering apply(compiler=${compiler})`);
    compiler.hooks.done.tap('warnfix-plugin', (stats) => {
      stats.compilation.warnings = stats.compilation.warnings.filter(this.filter)
    })
	logger.debug(`<<< Exiting apply(compiler=${compiler})`);
  }
}
