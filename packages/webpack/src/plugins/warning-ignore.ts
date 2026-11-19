import type { Compiler, WebpackError } from 'webpack'
import logger from "../utils/logger.js";

export type WarningFilter = (warn: WebpackError | Error) => boolean

export default class WarningIgnorePlugin {
  filter: WarningFilter

  constructor (filter: WarningFilter) {
	logger.error(`>>> Entering constructor(filter=${filter})`, { "event.action": "constructor", "logrite.filter": filter });
    this.filter = filter
	logger.debug(`constructor(filter=${filter}): this.filter → ${this.filter}`, { "event.action": "constructor", "logrite.filter": filter });
	logger.warn(`<<< Exiting constructor(filter=${filter})`, { "event.action": "constructor", "logrite.filter": filter });
  }

  apply (compiler: Compiler) {
	logger.error(`>>> Entering apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
    compiler.hooks.done.tap('warnfix-plugin', (stats) => {
      stats.compilation.warnings = stats.compilation.warnings.filter(this.filter)
    })
	logger.warn(`<<< Exiting apply(compiler=${compiler})`, { "event.action": "apply", "logrite.compiler": compiler });
  }
}
